
import { useEffect, useState } from "react";
import "./PhotoModal.css";

const API = "http://localhost:5001/api";

export default function PhotoModal({ photo, onClose }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [width, setWidth] = useState(1920);

  useEffect(() => {
    if (!photo) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [photo, onClose]);

  if (!photo) return null;

  const height = Math.round(
    (width * photo.height) / photo.width
  );

  const sizes = [
    { label: "Original", width: null },
    { label: "Large", width: 2400 },
    { label: "Medium", width: 1920 },
    { label: "Small", width: 640 },
  ];

  async function downloadImage(selectedWidth) {
    try {
      setDownloading(true);
      setMenuOpen(false);

      const params = new URLSearchParams();

      if (selectedWidth) {
        params.set("width", String(selectedWidth));
      }

      const response = await fetch(
        `${API}/photos/${encodeURIComponent(photo.id)}/download?${params}`
      );

      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `unsplash-${photo.id}-${selectedWidth || "original"}.jpg`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      alert(error.message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="photo-backdrop" onClick={onClose}>
      <button className="modal-close" onClick={onClose}>
        ✕
      </button>

      <div
        className="photo-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="photographer">
            <img
              src={photo.user.profile_image?.small}
              alt=""
            />

            <div>
              <strong>{photo.user.name}</strong>
              <span>@{photo.user.username}</span>
            </div>
          </div>

          <div className="modal-actions">
            <button className="action-btn">♡</button>

            <div className="download-group">
              <button
                className="download-main"
                disabled={downloading}
                onClick={() => downloadImage(null)}
              >
                {downloading ? "Downloading..." : "Download free"}
              </button>

              <button
                className="download-arrow"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                ▾
              </button>

              {menuOpen && (
                <div className="download-menu">
                  <p>Choose a size</p>

                  {sizes.map((size) => (
                    <button
                      key={size.label}
                      onClick={() => downloadImage(size.width)}
                    >
                      <span>{size.label}</span>
                      <span>
                        {size.width
                          ? `${Math.min(size.width, photo.width)} px wide`
                          : `${photo.width} × ${photo.height}`}
                      </span>
                    </button>
                  ))}

                  <div className="custom-size">
                    <label>Custom width (px)</label>

                    <input
                      type="number"
                      min="1"
                      max={photo.width}
                      value={width}
                      onChange={(e) =>
                        setWidth(Number(e.target.value))
                      }
                    />

                    <small>
                      Output: {width} × {height}
                    </small>

                    <button
                      className="custom-download"
                      disabled={
                        !Number.isInteger(width) ||
                        width < 1 ||
                        width > photo.width
                      }
                      onClick={() => downloadImage(width)}
                    >
                      Download custom size
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-image">
          <img
            src={photo.urls.regular}
            alt={photo.alt_description || "Photo"}
          />
        </div>

        <div className="modal-footer">
          <span>
            <a
              href={photo.user.links.html}
              target="_blank"
              rel="noreferrer"
            >
              {photo.user.name}
            </a>{" "}
            on{" "}
            <a
              href="https://unsplash.com"
              target="_blank"
              rel="noreferrer"
            >
              Unsplash
            </a>
          </span>
          <span>
            {photo.width} × {photo.height}
          </span>
        </div>
      </div>
    </div>
  );
}
