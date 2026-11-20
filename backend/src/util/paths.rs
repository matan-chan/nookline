use std::path::{Path, PathBuf};

const COVER_CACHE_SEGMENT: &str = ".cover-cache";
const DOCKER_BOOKS_ROOT: &str = "/books";

pub fn cover_cache_dir() -> PathBuf {
    upload_base_dir().join(".cover-cache")
}

pub fn avatar_dir() -> PathBuf {
    upload_base_dir().join("avatars")
}

pub fn branding_dir() -> PathBuf {
    upload_base_dir().join("branding")
}

pub fn library_banner_upload_dir() -> PathBuf {
    branding_dir().join("library-banners")
}

pub fn strip_windows_verbatim_path(s: &str) -> PathBuf {
    let trimmed = s.trim();
    let stripped = trimmed
        .strip_prefix(r"\\?\UNC\")
        .or_else(|| trimmed.strip_prefix(r"\\?\"))
        .or_else(|| trimmed.strip_prefix("//?/UNC/"))
        .or_else(|| trimmed.strip_prefix("//?/"))
        .unwrap_or(trimmed);
    PathBuf::from(stripped)
}

pub fn normalize_stored_upload_path(path: &str) -> String {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    let verbatim_abs = trimmed.starts_with(r"\\?\") || trimmed.starts_with("//?/");
    let p = strip_windows_verbatim_path(trimmed);
    if p.is_absolute() || verbatim_abs {
        let abs = std::fs::canonicalize(&p).unwrap_or(p);
        return rel_path_from_upload(&abs);
    }
    trimmed.replace('\\', "/")
}

fn upload_roots() -> Vec<PathBuf> {
    let mut roots = vec![upload_base_dir()];
    if let Ok(cwd) = std::env::current_dir() {
        if let Some(parent) = cwd.parent() {
            roots.push(parent.join("backend").join("uploads"));
        }
        roots.push(cwd.join("uploads"));
    }
    roots
}

pub fn rel_path_from_upload(abs: &Path) -> String {
    let stripped = strip_windows_verbatim_path(&abs.to_string_lossy());
    let abs = stripped
        .canonicalize()
        .or_else(|_| abs.canonicalize())
        .unwrap_or(stripped);
    for base in upload_roots() {
        let base = base.canonicalize().unwrap_or(base);
        if let Ok(rel) = abs.strip_prefix(&base) {
            return rel.to_string_lossy().replace('\\', "/");
        }
    }
    abs.to_string_lossy().replace('\\', "/")
}

pub fn abs_from_upload_rel(rel: &str) -> PathBuf {
    upload_base_dir().join(rel.replace('/', std::path::MAIN_SEPARATOR_STR))
}

pub fn upload_base_dir() -> PathBuf {
    if let Ok(override_dir) = std::env::var("UPLOAD_DIR") {
        let t = override_dir.trim();
        if !t.is_empty() {
            return PathBuf::from(t);
        }
    }
    if Path::new("/.dockerenv").exists() {
        return PathBuf::from(DOCKER_BOOKS_ROOT);
    }
    std::env::current_dir()
        .unwrap_or_default()
        .join("uploads")
}

pub fn resolve_library_content_dir(upload_dir: &Path, library_path: &str) -> PathBuf {
    let trimmed = library_path.trim();
    let base = upload_dir.canonicalize().unwrap_or_else(|_| upload_dir.to_path_buf());
    if trimmed.is_empty() {
        return base;
    }
    let segments: Vec<&str> = trimmed.split(['/', '\\']).filter(|s| !s.is_empty()).collect();
    let root_style = segments.len() == 1
        && trimmed
            .chars()
            .next()
            .is_some_and(|c| c == '/' || c == '\\');
    if root_style {
        let dest = base.join(segments[0]);
        if path_stays_under_base(&base, &dest) {
            return dest;
        }
    }
    let path = Path::new(trimmed);
    if path.is_absolute() {
        return path.canonicalize().unwrap_or_else(|_| path.to_path_buf());
    }
    let dest = base.join(trimmed.replace('\\', "/"));
    if !path_stays_under_base(&base, &dest) {
        return base;
    }
    dest
}

fn path_stays_under_base(base: &Path, dest: &Path) -> bool {
    let base = base.canonicalize().unwrap_or_else(|_| base.to_path_buf());
    let dest = dest.canonicalize().unwrap_or_else(|_| dest.to_path_buf());
    dest.starts_with(&base)
}

pub fn resolve_library_cover_cache_dir(library_path: &str) -> PathBuf {
    let trimmed = library_path.trim();
    let base = upload_base_dir();
    if trimmed.is_empty() {
        return base.join(COVER_CACHE_SEGMENT);
    }
    if Path::new(trimmed).is_absolute() {
        let abs = Path::new(trimmed)
            .canonicalize()
            .unwrap_or_else(|_| PathBuf::from(trimmed));
        return abs
            .parent()
            .unwrap_or(&abs)
            .join(COVER_CACHE_SEGMENT);
    }
    base.join(COVER_CACHE_SEGMENT)
}

pub fn resolve_stored_upload_path(library_path: &str, stored: &str) -> PathBuf {
    let trimmed = stored.trim();
    if trimmed.is_empty() {
        return PathBuf::new();
    }
    let p = strip_windows_verbatim_path(trimmed);
    if p.is_absolute() {
        return p;
    }
    let rel = p.to_string_lossy().replace('\\', "/");
    let rel_path = PathBuf::from(rel.replace('/', std::path::MAIN_SEPARATOR_STR));
    for base in upload_roots() {
        let direct = base.join(&rel_path);
        if direct.is_file() {
            return direct;
        }
        let lib_dir = resolve_library_content_dir(&base, library_path);
        let in_lib = lib_dir.join(&rel_path);
        if in_lib.is_file() {
            return in_lib;
        }
        if rel_path.parent().is_none() || rel_path.parent() == Some(Path::new("")) {
            let by_name = lib_dir.join(rel_path.file_name().unwrap_or_default());
            if by_name.is_file() {
                return by_name;
            }
        }
    }
    let lib_dir = resolve_library_content_dir(&upload_base_dir(), library_path);
    let in_lib = lib_dir.join(&rel_path);
    if in_lib.is_file() {
        return in_lib;
    }
    if rel_path.parent().is_none() || rel_path.parent() == Some(Path::new("")) {
        return lib_dir.join(rel_path.file_name().unwrap_or_default());
    }
    let direct = upload_base_dir().join(&rel_path);
    if direct.is_file() {
        return direct;
    }
    in_lib
}

pub fn resolve_book_file_on_disk(library_path: &str, stored_file_path: &str) -> PathBuf {
    resolve_stored_upload_path(library_path, stored_file_path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::sync::{Mutex, MutexGuard};

    static UPLOAD_ENV_LOCK: Mutex<()> = Mutex::new(());

    fn lock_upload_env() -> MutexGuard<'static, ()> {
        UPLOAD_ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner())
    }

    #[test]
    fn resolve_stored_upload_path_finds_bare_filename_in_library_dir() {
        let _guard = lock_upload_env();
        let dir = tempfile::tempdir().expect("tmpdir");
        let base = dir.path().join("books");
        let lib = base.join("comedy");
        std::fs::create_dir_all(&lib).expect("lib");
        std::fs::write(lib.join("a.pdf"), b"%PDF").expect("write");
        let prev = std::env::var("UPLOAD_DIR").ok();
        std::env::set_var("UPLOAD_DIR", base.to_string_lossy().as_ref());
        let resolved = resolve_stored_upload_path("/comedy", "a.pdf");
        assert!(resolved.is_file(), "{resolved:?}");
        if let Some(p) = prev {
            std::env::set_var("UPLOAD_DIR", p);
        } else {
            std::env::remove_var("UPLOAD_DIR");
        }
    }

    #[test]
    fn resolve_stored_upload_path_avoids_double_library_folder() {
        let _guard = lock_upload_env();
        let dir = tempfile::tempdir().expect("tmpdir");
        let base = dir.path().join("books");
        let lib = base.join("test67");
        std::fs::create_dir_all(&lib).expect("lib");
        let pdf = lib.join("sample.pdf");
        std::fs::write(&pdf, b"%PDF").expect("write");
        let prev = std::env::var("UPLOAD_DIR").ok();
        std::env::set_var("UPLOAD_DIR", base.to_string_lossy().as_ref());
        let resolved = resolve_stored_upload_path("/test67", "test67/sample.pdf");
        assert!(resolved.exists(), "{resolved:?}");
        if let Some(p) = prev {
            std::env::set_var("UPLOAD_DIR", p);
        } else {
            std::env::remove_var("UPLOAD_DIR");
        }
    }

    #[test]
    fn normalize_stored_upload_path_relative() {
        let _guard = lock_upload_env();
        let dir = tempfile::tempdir().expect("tmpdir");
        let base = dir.path().join("books");
        std::fs::create_dir_all(&base).expect("mkdir");
        let prev = std::env::var("UPLOAD_DIR").ok();
        std::env::set_var("UPLOAD_DIR", base.to_string_lossy().as_ref());
        let lib = base.join("rr");
        std::fs::create_dir_all(&lib).expect("lib");
        let pdf = lib.join("sample.pdf");
        std::fs::write(&pdf, b"%PDF").expect("write");
        let abs = pdf.canonicalize().unwrap_or(pdf);
        let rel = normalize_stored_upload_path(&abs.to_string_lossy());
        assert_eq!(rel, "rr/sample.pdf");
        let forward_verbatim = format!("//?/{}", abs.to_string_lossy().replace('\\', "/"));
        let rel2 = normalize_stored_upload_path(&forward_verbatim);
        assert_eq!(rel2, "rr/sample.pdf");
        if let Some(p) = prev {
            std::env::set_var("UPLOAD_DIR", p);
        } else {
            std::env::remove_var("UPLOAD_DIR");
        }
    }

    #[test]
    fn cover_cache_dir_under_upload_base() {
        let _guard = lock_upload_env();
        let dir = tempfile::tempdir().expect("tmpdir");
        let base = dir.path().join("books");
        std::fs::create_dir_all(&base).expect("mkdir");
        let prev = std::env::var("UPLOAD_DIR").ok();
        std::env::set_var("UPLOAD_DIR", base.to_string_lossy().as_ref());
        assert_eq!(cover_cache_dir(), base.join(".cover-cache"));
        if let Some(p) = prev {
            std::env::set_var("UPLOAD_DIR", p);
        } else {
            std::env::remove_var("UPLOAD_DIR");
        }
    }

    #[test]
    fn upload_dir_honors_env() {
        let _guard = lock_upload_env();
        let prev = std::env::var("UPLOAD_DIR").ok();
        std::env::set_var("UPLOAD_DIR", "D:\\books");
        assert_eq!(upload_base_dir(), PathBuf::from("D:\\books"));
        if let Some(p) = prev {
            std::env::set_var("UPLOAD_DIR", p);
        } else {
            std::env::remove_var("UPLOAD_DIR");
        }
    }

    #[test]
    fn resolve_library_content_dir_relative() {
        let dir = tempfile::tempdir().expect("tmpdir");
        let base = dir.path().join("u");
        fs::create_dir_all(&base).expect("mkdir");
        let same_dir = |a: PathBuf, b: PathBuf| {
            a.canonicalize().unwrap_or(a) == b.canonicalize().unwrap_or(b)
        };
        assert!(same_dir(
            resolve_library_content_dir(&base, ""),
            base.clone()
        ));
        assert!(same_dir(
            resolve_library_content_dir(&base, "   "),
            base.clone()
        ));
        let comedy = base.join("comedy");
        fs::create_dir_all(&comedy).expect("mkdir comedy");
        assert!(same_dir(
            resolve_library_content_dir(&base, "comedy"),
            comedy.clone()
        ));
        assert!(same_dir(
            resolve_library_content_dir(&base, "/comedy"),
            comedy
        ));
    }

    #[test]
    fn resolve_library_cover_cache_relative_and_absolute() {
        let _guard = lock_upload_env();
        let prev = std::env::var("UPLOAD_DIR").ok();
        let dir = tempfile::tempdir().expect("tmpdir");
        let upload = dir.path().join("uploads");
        std::fs::create_dir_all(&upload).expect("mkdir");
        std::env::set_var("UPLOAD_DIR", upload.to_string_lossy().as_ref());
        let same = |a: PathBuf, b: PathBuf| {
            a.canonicalize().unwrap_or(a) == b.canonicalize().unwrap_or(b)
        };
        assert!(same(
            resolve_library_cover_cache_dir("comedy"),
            upload.join(".cover-cache")
        ));
        let lib_abs = upload.join("yy");
        std::fs::create_dir_all(&lib_abs).expect("abs lib");
        let abs = lib_abs.canonicalize().unwrap_or(lib_abs.clone());
        assert!(same(
            resolve_library_cover_cache_dir(abs.to_string_lossy().as_ref()),
            abs.parent().unwrap_or(&abs).join(".cover-cache")
        ));
        if let Some(p) = prev {
            std::env::set_var("UPLOAD_DIR", p);
        } else {
            std::env::remove_var("UPLOAD_DIR");
        }
    }
}