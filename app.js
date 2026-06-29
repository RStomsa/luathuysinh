document.addEventListener("DOMContentLoaded", () => {
    const R2_DOMAIN = "https://pub-7ea26a5215634e0c92af75bd92031d99.r2.dev";
    
    let catalogData = {};
    let loadedImagesCount = 0;
    const BATCH_LOAD = 16;
    let currentImagesList = [];

    const gallery = document.getElementById("gallery");
    const searchBoxSearch = document.querySelector(".search-box");

    // Load Cache Catalog
    const cached = localStorage.getItem("catalog_cache");
    if (cached) {
        catalogData = JSON.parse(cached);
        initApp(catalogData);
    } else {
        fetch('./catalog.json')
            .then(res => res.json())
            .then(data => {
                catalogData = data;
                localStorage.setItem("catalog_cache", JSON.stringify(data));
                initApp(data);
            })
            .catch(err => console.error("Lỗi tải catalog.json:", err));
    }

    function initApp(catalog) {
        const validCategories = Object.keys(catalog).filter(key => catalog[key] && catalog[key].length > 0);
        renderSidebar(validCategories);
        if (validCategories.length > 0) {
            switchCategory(validCategories[0]);
        }
    }

    function getLeafIconSvg() {
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#26a69a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a8 8 0 0 0-8 8c0 2.5 1.2 5 3 6.5s3 3.5 3 5.5a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1c0-2 1.5-4 3-5.5s3-4 3-5.5a8 8 0 0 0-8-8z"></path>
            <path d="M11 20v2"></path>
            <path d="M4 14h2"></path>
        </svg>`;
    }

    function renderSidebar(categories) {
        const sidebar = document.getElementById("sidebar");
        sidebar.innerHTML = "";
        
        categories.forEach(category => {
            const btn = document.createElement("button");
            btn.className = "sidebar-item";
            
            // Xử lý cây thư mục: Lấy tên thư mục cấp thấp nhất hoặc hiển thị nguyên bản
            const cleanName = category.split('/').pop().replace(/_/g, ' ');
            btn.innerHTML = `${getLeafIconSvg()} <span>${cleanName}</span>`;
            btn.dataset.category = category;
            
            btn.addEventListener("click", () => switchCategory(category));
            sidebar.appendChild(btn);
        });
    }

    function switchCategory(category) {
        document.querySelectorAll(".sidebar-item").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.category === category);
        });

        currentCategory = category;
        currentImagesList = catalogData[category] || [];
        loadedImagesCount = 0;
        gallery.innerHTML = ""; 
        
        // Reset cuộn lên đỉnh khi đổi thư mục
        gallery.scrollTo(0, 0);
        loadMoreImages();
    }

    // Sửa chuẩn vô hạn cuộn (Infinite Scroll) chuẩn xác trên container gallery
    function loadMoreImages() {
        const imagesToLoad = currentImagesList.slice(loadedImagesCount, loadedImagesCount + BATCH_LOAD);
        if (imagesToLoad.length === 0) return;

        const fragment = document.createDocumentFragment();

        imagesToLoad.forEach(imgPath => {
            const card = document.createElement("div");
            card.className = "gallery-card";
            
            const img = document.createElement("img");
            const fullR2Url = `${R2_DOMAIN}/${encodeURIComponent(imgPath)}`;
            
            img.dataset.src = fullR2Url;
            img.alt = imgPath.split('/').pop().replace(/\.[^/.]+$/, "");
            img.className = "lazy-img";
            img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E";
            
            card.addEventListener("click", () => openLightbox(fullR2Url));
            
            card.appendChild(img);
            fragment.appendChild(card);
        });

        gallery.appendChild(fragment);
        activeLazyLoad();
        loadedImagesCount += BATCH_LOAD;
    }

    // Lắng nghe sự kiện cuộn trực tiếp trên khung #gallery (div .gallery-grid)
    gallery.addEventListener("scroll", () => {
        // Kiểm tra chiều cao cuộn của chính thẻ main#gallery
        if (gallery.scrollTop + gallery.clientHeight >= gallery.scrollHeight - 150) {
            loadMoreImages();
        }
    });

    function activeLazyLoad() {
        const lazyImages = document.querySelectorAll(".lazy-img:not(.observed)");
        
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.onload = () => img.classList.add("loaded");
                    img.classList.add("observed");
                    observer.unobserve(img);
                }
            });
        }, { root: gallery, rootMargin: "200px" });

        lazyImages.forEach(img => observer.observe(img));
    }

    // Lightbox xử lý phóng to
    const lightbox = document.getElementById("lightbox");
    const lightboxImg = document.getElementById("lightboxImg");
    const closeBtn = document.querySelector(".lightbox-close");

    function openLightbox(imgSrc) {
        lightboxImg.src = imgSrc;
        lightbox.classList.add("active");
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        lightbox.classList.remove("active");
        document.body.style.overflow = '';
        setTimeout(() => { lightboxImg.src = ""; }, 300);
    }

    if (closeBtn) {
        closeBtn.addEventListener("click", closeLightbox);
    }
    
    lightbox.addEventListener("click", (e) => {
        // Tránh bấm vào ảnh bị tắt popup
        if (e.target !== lightboxImg && !e.target.closest('.lightbox-close')) {
            closeLightbox();
        }
    });

    // Tìm kiếm
    const searchBox = document.querySelector(".search-box");
    if (searchBox) {
        searchBox.addEventListener("input", (e) => {
            const keyword = e.target.value.toLowerCase();
            const allCards = gallery.querySelectorAll(".gallery-card");
            
            allCards.forEach(card => {
                const imgAlt = card.querySelector("img").alt.toLowerCase();
                if (imgAlt.includes(keyword)) {
                    card.style.display = "block";
                } else {
                    card.style.display = "none";
                }
            });
        });
    }
});
