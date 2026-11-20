use std::collections::HashMap;

pub fn find_opf_item_href_by_id(opf: &str, item_id: &str) -> Option<String> {
    let re = regex::Regex::new(r"(?i)<item\b([^>]*)/?>").ok()?;
    let id_re = regex::Regex::new(r#"(?i)\bid\s*=\s*["']([^"']+)["']"#).ok()?;
    let href_re = regex::Regex::new(r#"\bhref\s*=\s*["']([^"']+)["']"#).ok()?;
    for cap in re.captures_iter(opf) {
        let block = cap.get(1)?.as_str();
        let id_m = id_re.captures(block)?;
        if id_m.get(1)?.as_str() != item_id {
            continue;
        }
        let href_m = href_re.captures(block)?;
        return Some(href_m.get(1)?.as_str().to_string());
    }
    None
}

pub fn resolve_zip_path(opf_path: &str, href: &str) -> String {
    let dec: String = href
        .split('/')
        .map(|p| urlencoding::decode(p).map(|c| c.into_owned()).unwrap_or_else(|_| p.to_string()))
        .collect::<Vec<_>>()
        .join("/");
    let opf_dir = if let Some(i) = opf_path.rfind('/') {
        &opf_path[..=i]
    } else {
        ""
    };
    let joined = format!("{opf_dir}{dec}");
    joined
        .replace('\\', "/")
        .split('/')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("/")
}

pub fn find_zip_entry_key(files: &HashMap<String, bool>, target: &str) -> Option<String> {
    let norm = target
        .replace('\\', "/")
        .trim_start_matches('/')
        .to_lowercase();
    let keys: Vec<&String> = files.iter().filter(|(_, is_dir)| !**is_dir).map(|(k, _)| k).collect();
    if let Some(exact) = keys.iter().find(|k| k.trim_start_matches('/').to_lowercase() == norm) {
        return Some((*exact).clone());
    }
    keys.iter()
        .find(|k| k.trim_start_matches('/').to_lowercase().ends_with(&norm))
        .map(|k| (*k).clone())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn find_opf_href() {
        let opf = r#"<package><item id="c1" href="cover.jpg" properties="cover-image"/></package>"#;
        assert_eq!(
            find_opf_item_href_by_id(opf, "c1").as_deref(),
            Some("cover.jpg")
        );
        assert!(find_opf_item_href_by_id(r#"<item id="x" href="a.png"/>"#, "y").is_none());
    }

    #[test]
    fn resolve_zip_path_joins_and_decodes() {
        assert_eq!(
            resolve_zip_path("OEBPS/content.opf", "Images/cover.jpg"),
            "OEBPS/Images/cover.jpg"
        );
        assert_eq!(
            resolve_zip_path("ops/foo.opf", "img/hello%20world.png"),
            "ops/img/hello world.png"
        );
    }

    #[test]
    fn find_zip_entry_key_cases() {
        let mut files = HashMap::new();
        files.insert("OEBPS/text.xhtml".to_string(), false);
        files.insert("OEBPS/Images/cover.jpg".to_string(), false);
        files.insert("META".to_string(), true);
        assert_eq!(
            find_zip_entry_key(&files, "oebps/images/cover.jpg").as_deref(),
            Some("OEBPS/Images/cover.jpg")
        );
        let mut extra = HashMap::new();
        extra.insert("prefix/OEBPS/cover.jpg".to_string(), false);
        assert_eq!(
            find_zip_entry_key(&extra, "cover.jpg").as_deref(),
            Some("prefix/OEBPS/cover.jpg")
        );
        assert!(find_zip_entry_key(&extra, "missing").is_none());
    }
}