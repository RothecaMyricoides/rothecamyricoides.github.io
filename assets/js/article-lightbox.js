(() => {
  const dialog = document.querySelector("#article-image-lightbox");
  const lightboxImage = dialog?.querySelector(".image-lightbox__image");
  const caption = dialog?.querySelector(".image-lightbox__caption");
  const closeButton = dialog?.querySelector(".image-lightbox__close");

  if (!dialog || !lightboxImage || !caption || !closeButton || typeof dialog.showModal !== "function") {
    return;
  }

  let lastTrigger = null;

  const closeLightbox = () => {
    if (dialog.open) {
      dialog.close();
    }
  };

  const openLightbox = (trigger, image, figure) => {
    lastTrigger = trigger;
    lightboxImage.src = image.currentSrc || image.src;
    lightboxImage.alt = image.alt || "";
    caption.textContent = figure.querySelector("figcaption")?.textContent.trim() || image.alt || "";
    dialog.showModal();
    document.body.classList.add("image-lightbox-open");
    closeButton.focus();
  };

  document.querySelectorAll(".article-figure").forEach((figure) => {
    const image = figure.querySelector("img");
    if (!image) {
      return;
    }

    const link = image.closest("a");
    const trigger = link || image;

    image.classList.add("is-previewable");
    trigger.classList.add("image-preview-trigger");

    if (!link) {
      trigger.tabIndex = 0;
      trigger.setAttribute("role", "button");
      trigger.setAttribute("aria-label", image.alt ? `预览图片：${image.alt}` : "预览图片");
    }

    trigger.addEventListener("click", (event) => {
      if ("button" in event && event.button !== 0) {
        return;
      }
      event.preventDefault();
      openLightbox(trigger, image, figure);
    });

    if (!link) {
      trigger.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openLightbox(trigger, image, figure);
        }
      });
    }
  });

  closeButton.addEventListener("click", closeLightbox);

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      closeLightbox();
    }
  });

  dialog.addEventListener("close", () => {
    document.body.classList.remove("image-lightbox-open");
    lightboxImage.removeAttribute("src");
    lastTrigger?.focus();
  });
})();
