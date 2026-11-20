use serde_json::Value;

const RECOMMEND_POOL_LIMIT: i64 = 500;
const RECOMMEND_DEFAULT_LIMIT: i64 = 10;
const RECOMMEND_MAX_LIMIT: i64 = 20;

fn parse_meta(raw: &Option<String>) -> Value {
    let Some(s) = raw.as_deref() else {
        return Value::Object(Default::default());
    };
    serde_json::from_str(s).unwrap_or(Value::Object(Default::default()))
}

fn norm(s: &str) -> String {
    s.trim().to_lowercase()
}

fn author_from(meta: &Value) -> Option<String> {
    if let Some(a) = meta.get("author").and_then(|v| v.as_str()) {
        let t = a.trim();
        if !t.is_empty() {
            return Some(norm(t));
        }
    }
    let lf = meta.get("localFallback");
    if let Some(ia) = lf
        .and_then(|v| v.get("inferredAuthor"))
        .and_then(|v| v.as_str())
    {
        let t = ia.trim();
        if !t.is_empty() {
            return Some(norm(t));
        }
    }
    None
}

fn genre_from(meta: &Value) -> Option<String> {
    meta.get("genre")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(norm)
}

fn subjects_from(meta: &Value) -> Vec<String> {
    let mut out = Vec::new();
    if let Some(subj) = meta.get("openLibrary").and_then(|v| v.get("subjects")).and_then(|v| v.as_array())
    {
        for x in subj {
            if let Some(s) = x.as_str() {
                out.push(norm(s));
            }
        }
    }
    if let Some(g) = genre_from(meta) {
        out.push(g);
    }
    out
}

fn has_any_signal(meta: &Value) -> bool {
    author_from(meta).is_some() || genre_from(meta).is_some() || !subjects_from(meta).is_empty()
}

fn score_against(source: &Value, candidate: &Value) -> i64 {
    let mut score = 0i64;
    if let (Some(a), Some(b)) = (author_from(source), author_from(candidate)) {
        if a == b {
            score += 100;
        }
    }
    if let (Some(a), Some(b)) = (genre_from(source), genre_from(candidate)) {
        if a == b {
            score += 50;
        }
    }
    let src_sub = subjects_from(source);
    if !src_sub.is_empty() {
        let set: std::collections::HashSet<_> = src_sub.iter().collect();
        for s in subjects_from(candidate) {
            if set.contains(&s) {
                score += 10;
                break;
            }
        }
    }
    score
}

pub fn sanitize_rec_limit(limit: Option<i32>) -> i64 {
    limit
        .map(|l| l as i64)
        .unwrap_or(RECOMMEND_DEFAULT_LIMIT)
        .clamp(1, RECOMMEND_MAX_LIMIT)
}

pub fn pick_recommended_ids(
    source_meta: &Value,
    pool: &[(i64, Option<String>)],
    source_book_id: i64,
    limit: i64,
) -> Vec<i64> {
    if !has_any_signal(source_meta) {
        return vec![];
    }
    let mut rows: Vec<(i64, i64)> = pool
        .iter()
        .filter(|(id, _)| *id != source_book_id)
        .map(|(id, meta)| {
            let score = score_against(source_meta, &parse_meta(meta));
            (*id, score)
        })
        .filter(|(_, score)| *score > 0)
        .collect();
    rows.sort_by(|a, b| b.1.cmp(&a.1).then(b.0.cmp(&a.0)));
    let mut out = Vec::new();
    let mut seen = std::collections::HashSet::new();
    for (id, _) in rows {
        if seen.insert(id) {
            out.push(id);
            if out.len() as i64 >= limit {
                break;
            }
        }
    }
    out
}

pub fn merge_with_fallback(scored: Vec<i64>, pool_ids: &[i64], cap: i64) -> Vec<i64> {
    let mut seen = std::collections::HashSet::new();
    let mut out = Vec::new();
    for id in scored {
        if seen.insert(id) {
            out.push(id);
            if out.len() as i64 >= cap {
                return out;
            }
        }
    }
    let mut filler: Vec<i64> = pool_ids.iter().copied().filter(|id| !seen.contains(id)).collect();
    use rand::seq::SliceRandom;
    filler.shuffle(&mut rand::rng());
    for id in filler {
        seen.insert(id);
        out.push(id);
        if out.len() as i64 >= cap {
            break;
        }
    }
    out
}

pub const REC_POOL_LIMIT: i64 = RECOMMEND_POOL_LIMIT;

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn merge_with_fallback_fills_from_pool() {
        let user_wide = vec![10, 11, 12];
        let ids = merge_with_fallback(vec![], &user_wide, 3);
        assert_eq!(ids.len(), 3);
        let mut sorted = ids.clone();
        sorted.sort();
        assert_eq!(sorted, vec![10, 11, 12]);
    }

    #[test]
    fn merge_with_fallback_two_stage_like_bun() {
        let same_lib = vec![1, 2];
        let user_wide: Vec<i64> = (1..=10).collect();
        let mut ids = merge_with_fallback(vec![], &same_lib, 10);
        assert_eq!(ids.len(), 2);
        ids = merge_with_fallback(ids, &user_wide, 10);
        assert_eq!(ids.len(), 10);
        assert_eq!(ids.iter().collect::<std::collections::HashSet<_>>().len(), 10);
    }

    #[test]
    fn pick_recommended_ids_requires_signal() {
        let pool = vec![(2, Some(r#"{"author":"A"}"#.to_string()))];
        let empty = json!({});
        assert!(pick_recommended_ids(&empty, &pool, 1, 5).is_empty());
        let with_author = json!({ "author": "A" });
        let ids = pick_recommended_ids(&with_author, &pool, 99, 5);
        assert_eq!(ids, vec![2]);
    }

    #[test]
    fn sanitize_rec_limit_clamps() {
        assert_eq!(sanitize_rec_limit(None), 10);
        assert_eq!(sanitize_rec_limit(Some(0)), 1);
        assert_eq!(sanitize_rec_limit(Some(100)), 20);
    }
}