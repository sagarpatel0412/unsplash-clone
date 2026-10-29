import { useEffect, useRef, useState } from "react";
import {
  Search,
  Menu,
  X,
  Download,
  Heart,
  Plus,
  ChevronDown,
  SlidersHorizontal,
  Image as ImageIcon,
} from "lucide-react";
import PhotoModal from "./components/PhotoModal";

const topics = [
  "Featured",
  "Nature",
  "Animals",
  "Architecture",
  "Experimental",
  "Fashion & Beauty",
  "Film",
  "People",
  "Travel",
  "3D Renders",
  "Street Photography",
  "Food & Drink",
];
const tracking = "utm_source=photo_gallery_learning&utm_medium=referral";
const tagged = (url) => `${url}${url.includes("?") ? "&" : "?"}${tracking}`;

function SearchBox({ value, setValue, onSubmit, hero = false }) {
  return (
    <form className={`search ${hero ? "search-hero" : ""}`} onSubmit={onSubmit}>
      <Search size={21} strokeWidth={2} className="muted" />
      <input
        aria-label="Search photos"
        placeholder="Search high-resolution images"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {value && (
        <button
          type="button"
          className="icon-button"
          onClick={() => setValue("")}
          aria-label="Clear search"
        >
          <X size={16} />
        </button>
      )}
      <button
        type="submit"
        className="search-submit"
        aria-label="Submit search"
      >
        <Search size={19} />
      </button>
    </form>
  );
}

function Credit({ photo }) {
  return (
    <span>
      Photo by{" "}
      <a
        href={tagged(photo.user.links.html)}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
      >
        {photo.user.name}
      </a>{" "}
      on{" "}
      <a
        href={`https://unsplash.com/?${tracking}`}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
      >
        Unsplash
      </a>
    </span>
  );
}

export default function App() {
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [orientation, setOrientation] = useState("");
  const [order, setOrder] = useState("relevant");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState("");
  const [sidebar, setSidebar] = useState(false);
  const [liked, setLiked] = useState(() => new Set());
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const pending = useRef(null);

  const searchFor = (term) => {
    setText(term);
    setQuery(term);
    setPage(1);
    setSelectedPhoto(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const onSubmit = (e) => {
    e.preventDefault();
    searchFor(text.trim());
  };

  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError("");
    if (page === 1) setPhotos([]);
    const params = new URLSearchParams({
      page: String(page),
      query,
      order_by: order,
    });
    if (orientation) params.set("orientation", orientation);
    fetch(`http://localhost:5001/api/photos?${params}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok)
          throw new Error(json.message || "Could not load photos");
        return json;
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        setPhotos((prev) =>
          page === 1
            ? data.results
            : [
                ...prev,
                ...data.results.filter(
                  (p) => !prev.some((old) => old.id === p.id),
                ),
              ],
        );
        setTotalPages(data.totalPages);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [query, page, order, orientation]);

  useEffect(() => {
    if (!selected) return;
    const listener = (e) => {
      if (e.key === "Escape") setSelected(null);
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [selected]);

  const download = async (photo) => {
    if (pending.current) return;
    pending.current = photo.id;
    setSaving(photo.id);
    try {
      const response = await fetch(
        `http://localhost:5001/api/photos/${encodeURIComponent(photo.id)}/download`,
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Download failed");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `photo-${photo.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      alert(e.message);
    } finally {
      pending.current = null;
      setSaving("");
    }
  };
  const toggleLike = (id) =>
    setLiked((old) => {
      const next = new Set(old);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="app">
      <header className="topbar">
        <button
          className="menu-button icon-button"
          aria-label="Open topics"
          onClick={() => setSidebar(true)}
        >
          <Menu size={23} />
        </button>
        <button
          className="wordmark"
          onClick={() => searchFor("")}
          aria-label="Home"
        >
          <span className="mark">
            <span />
          </span>
          <strong>Photos</strong>
        </button>
        <div className="top-search">
          <SearchBox value={text} setValue={setText} onSubmit={onSubmit} />
        </div>
        <nav className="rightnav">
          <a
            href={`https://unsplash.com/?${tracking}`}
            target="_blank"
            rel="noreferrer"
          >
            Explore
          </a>
          <span>Advertise</span>
          <span className="subtle">Log in</span>
          <button
            className="outline"
            onClick={() =>
              window.open("https://unsplash.com/developers", "_blank")
            }
          >
            API docs
          </button>
        </nav>
      </header>
      <nav className="topics" aria-label="Photo topics">
        {topics.map((t) => (
          <button
            key={t}
            className={
              (!query && t === "Featured") ||
              query.toLowerCase() === t.toLowerCase()
                ? "active"
                : ""
            }
            onClick={() => searchFor(t === "Featured" ? "" : t)}
          >
            {t}
          </button>
        ))}
      </nav>
      {!query ? (
        <section className="hero">
          <div className="hero-content">
            <h1>Unsplash</h1>
            <h2>The internet’s source for visuals.</h2>
            <p>Powered by creators everywhere.</p>
            <SearchBox
              hero
              value={text}
              setValue={setText}
              onSubmit={onSubmit}
            />
            <p className="trending">
              Trending searches:{" "}
              <button onClick={() => searchFor("wallpapers")}>
                wallpapers
              </button>
              , <button onClick={() => searchFor("nature")}>nature</button>,{" "}
              <button onClick={() => searchFor("people")}>people</button>,{" "}
              <button onClick={() => searchFor("travel")}>travel</button>
            </p>
          </div>
          <span className="hero-credit">
            Images provided by{" "}
            <a
              href={`https://unsplash.com/?${tracking}`}
              target="_blank"
              rel="noreferrer"
            >
              Unsplash
            </a>
          </span>
        </section>
      ) : (
        <section className="results-header">
          <h1>{query.charAt(0).toUpperCase() + query.slice(1)}</h1>
          <div className="related">
            Related images from independent creators
          </div>
        </section>
      )}
      <main className="main">
        <div className="feed-toolbar">
          <h3>{query ? "Photos" : "Editorial"}</h3>
          <div className="filters">
            {query && (
              <label>
                <SlidersHorizontal size={17} />
                <select
                  aria-label="Orientation"
                  value={orientation}
                  onChange={(e) => {
                    setOrientation(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Any orientation</option>
                  <option value="landscape">Landscape</option>
                  <option value="portrait">Portrait</option>
                  <option value="squarish">Square</option>
                </select>
              </label>
            )}
            <label>
              Sort by <ChevronDown size={14} />
              <select
                aria-label="Sort"
                value={order}
                onChange={(e) => {
                  setOrder(e.target.value);
                  setPage(1);
                }}
              >
                <option value="relevant">Relevance</option>
                <option value="latest">Newest</option>
              </select>
            </label>
          </div>
        </div>
        {error && (
          <div className="notice error">
            {error}. Check your Unsplash access key or rate limit.
          </div>
        )}
        <div className="masonry">
          {photos.map((photo) => (
            <article className="tile" key={photo.id}>
              <button
  type="button"
  className="photo-hit"
  aria-label={`View photo by ${photo.user.name}`}
  onClick={() => {
    e.stopPropagation();
    console.log("Photo clicked:", photo);
    setSelectedPhoto(photo);
  }}
>
  <img
    src={photo.urls.small}
    alt={
      photo.alt_description ||
      photo.description ||
      "Photo"
    }
    loading="lazy"
    style={{
      backgroundColor: photo.color || "#ddd",
    }}
  />
</button>
              {/* <button
                className="photo-hit"
                // onClick={() => setSelected(photo)}
                aria-label={`View photo by ${photo.user.name}`}
                onClick={() => {
                        (setSelectedPhoto(photo), console.log(photo, "photo"));
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") setSelectedPhoto(photo);
                      }}
              >
                <img
                  src={photo.urls.small}
                  alt={photo.alt_description || photo.description || "Photo"}
                  loading="lazy"
                  style={{ backgroundColor: photo.color || "#ddd" }}
                  
                />
              </button> */}
              <div className="tile-overlay">
                <div className="tile-tools">
                  <button
                    className={`tile-button ${liked.has(photo.id) ? "hearted" : ""}`}
                    title="Save locally"
                    aria-label="Favorite photo"
                    onClick={() => toggleLike(photo.id)}
                  >
                    <Heart
                      size={17}
                      fill={liked.has(photo.id) ? "currentColor" : "none"}
                    />
                  </button>
                  <button
                    className="tile-button"
                    title="View photo"
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <Plus size={17} />
                  </button>
                </div>
                <div className="tile-foot">
                  <a
                    className="person"
                    href={tagged(photo.user.links.html)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      src={photo.user.profile_image.small}
                      alt=""
                    />
                    <span>{photo.user.name}</span>
                  </a>
                  <button
                    className="tile-button"
                    title="Download photo"
                    disabled={!!saving}
                    onClick={() => download(photo)}
                  >
                    <Download size={18} />
                  </button>
                </div>
              </div>
              <div className="mobile-credit">
                <Credit photo={photo} />
                <button onClick={() => download(photo)} disabled={!!saving}>
                  <Download size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
        <>
    {/* Your navbar, search bar, and photo grid */}

    {selectedPhoto && (
      <PhotoModal
        photo={selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
      />
    )}
  </>
        {busy && (
          <div className="loading">
            <div className="spinner" />
            Loading photos…
          </div>
        )}
        {!busy && !error && photos.length === 0 && (
          <div className="notice">No photos found. Try another search.</div>
        )}
        {!busy && !error && photos.length > 0 && page < totalPages && (
          <div className="more">
            <button onClick={() => setPage((v) => v + 1)}>
              Load more photos
            </button>
          </div>
        )}
        <footer>
          Photos from{" "}
          <a
            href={`https://unsplash.com/?${tracking}`}
            target="_blank"
            rel="noreferrer"
          >
            Unsplash
          </a>
          . Learning-project UI, not an official Unsplash product.
        </footer>
      </main>
      {sidebar && (
        <div className="drawer-backdrop" onClick={() => setSidebar(false)}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <strong>Explore photos</strong>
              <button className="icon-button" onClick={() => setSidebar(false)}>
                <X />
              </button>
            </div>
            {topics.map((t) => (
              <button
                key={t}
                onClick={() => {
                  searchFor(t === "Featured" ? "" : t);
                  setSidebar(false);
                }}
              >
                <ImageIcon size={18} />
                {t}
              </button>
            ))}
          </aside>
        </div>
      )}
      {/* {selected && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Photo preview"
          >
            <div className="modal-top">
              <a
                className="person dark"
                href={tagged(selected.user.links.html)}
                target="_blank"
                rel="noreferrer"
              >
                <img src={selected.user.profile_image.small} alt="" />
                <span>
                  <strong>{selected.user.name}</strong>
                  <small>Available on Unsplash</small>
                </span>
              </a>
              <div className="modal-actions">
                <button
                  className="outline"
                  onClick={() => toggleLike(selected.id)}
                >
                  <Heart
                    size={17}
                    fill={liked.has(selected.id) ? "currentColor" : "none"}
                  />
                </button>
                <button
                  className="download-btn"
                  disabled={!!saving}
                  onClick={() => download(selected)}
                >
                  <Download size={17} />
                  {saving === selected.id ? "Downloading…" : "Download free"}
                </button>
                <button
                  className="icon-button"
                  aria-label="Close preview"
                  onClick={() => setSelected(null)}
                >
                  <X size={22} />
                </button>
              </div>
            </div>
            <div className="modal-photo">
              <img
                src={selected.urls.regular}
                alt={selected.alt_description || "Photograph"}
              />
            </div>
            <div className="modal-bottom">
              <Credit photo={selected} />
              {selected.description && <p>{selected.description}</p>}
            </div>
          </div>
        </div>
      )} */}
      {/* <>
        {selectedPhoto && (
          <PhotoModal
            photo={selectedPhoto}
            onClose={() => setSelectedPhoto(null)}
          />
        )}
      </> */}
    </div>
  );
}
