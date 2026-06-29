document.addEventListener("DOMContentLoaded", () => {
    const R2_DOMAIN = "https://pub-7ea26a5215634e0c92af75bd92031d99.r2.dev";
    
    let catalogData = {};
    let loadedImagesCount = 0;
    const BATCH_LOAD = 16;
    let currentImagesList = [];

    const gallery = document.getElementById("gallery");
    const searchBox = document.querySelector(".search-box");

    // Tải Cache Catalog
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

    // Phân cấp menu sidebar
    function renderSidebar(categories) {
        const sidebar = document.getElementById("sidebar");
        sidebar.innerHTML = "";
        
        categories.forEach(category => {
            const btn = document.createElement("button");
            btn.className = "sidebar-item";
            
            // Xử lý tên hiển thị menu gọn gàng
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
        // Lấy mảng object chứa cả đường dẫn R2 và ID Google Drive
        currentImagesList = catalogData[category] || [];
        loadedImagesCount = 0;
        gallery.innerHTML = ""; 
        
        gallery.scrollTo(0, 0);
        loadMoreImages();
    }

    // Nạp ảnh phân đoạn chống lag
    function loadMoreImages() {
        const imagesToLoad = currentImagesList.slice(loadedImagesCount, loadedImagesCount + BATCH_LOAD);
        if (imagesToLoad.length === 0) return;

        const fragment = document.createDocumentFragment();

        imagesToLoad.forEach(item => {
            const card = document.createElement("div");
            card.className = "gallery-card";
            
            const img = document.createElement("img");
            const fullR2Url = `${R2_DOMAIN}/${encodeURIComponent(item.path)}`;
            
            img.dataset.src = fullR2Url;
            img.alt = item.path.split('/').pop().replace(/\.[^/.]+$/, "");
            img.className = "lazy-img";
            img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E";
            
            // Bấm vào thẻ ảnh mở popup kèm ID liên kết file gốc Drive
            card.addEventListener("click", () => openLightbox(fullR2Url, item.id));
            
            card.appendChild(img);
            fragment.appendChild(card);
        });

        gallery.appendChild(fragment);
        activeLazyLoad();
        loadedImagesCount += BATCH_LOAD;
    }

    gallery.addEventListener("scroll", () => {
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

    // 🌟 Lightbox Tích hợp Nút xem file gốc Drive
    const lightbox = document.getElementById("lightbox");
    const lightboxImg = document.getElementById("lightboxImg");
    const closeBtn = document.querySelector(".lightbox-close");
    
    // Tạo thêm nút "Xem File Gốc" dưới khung lightbox
    let viewOriginalBtn = document.getElementById("viewOriginalBtn");
    if (!viewOriginalBtn) {
        viewOriginalBtn = document.createElement("a");
        viewOriginalBtn.id = "viewOriginalBtn";
        viewOriginalBtn.className = "lightbox-view-original";
        viewOriginalBtn.target = "_blank";
        viewOriginalBtn.innerHTML = "📂 Xem file gốc trên Drive";
        lightbox.appendChild(viewOriginalBtn);
        
        // CSS inline nhanh cho nút xem file gốc
        const styleNode = document.createElement("style");
        styleNode.innerHTML = `
            .lightbox-view-original {
                position: absolute;
                bottom: 20px;
                background-color: rgba(38, 166, 154, 0.9);
                color: white;
                padding: 10px 20px;
                border-radius: 20px;
                text-decoration: none;
                font-size: 13px;
                font-weight: bold;
                border: 1px solid rgba(255,255,255,0.2);
                box-shadow: 0 4px 10px rgba(0,0,0,0.5);
                transition: background-color 0.2s, transform 0.2s;
                z-index: 2010;
            }
            .lightbox-view-original:hover {
                background-color: #00897b;
                transform: scale(1.05);
            }
        `;
        document.head.appendChild(styleNode);
    }

    function openLightbox(imgSrc, driveId) {
        lightboxImg.src = imgSrc;
        
        // Trỏ link trực tiếp tới file gốc Google Drive thông qua ID
        if (driveId) {
            viewOriginalBtn.href = `https://drive.google.com/file/d/${driveId}/view`;
            viewOriginalBtn.style.display = "block";
        } else {
            viewOriginalBtn.style.display = "none";
        }
        
        lightbox.classList.add("active");
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        lightbox.classList.remove("active");
        viewOriginalBtn.style.display = "none";
        document.body.style.overflow = '';
        setTimeout(() => { lightboxImg.src = ""; }, 300);
    }

    if (closeBtn) {
        closeBtn.addEventListener("click", closeLightbox);
    }
    
    lightbox.addEventListener("click", (e) => {
        // Tránh bấm vào ảnh/nút bị tắt popup
        if (e.target !== lightboxImg && !e.target.closest('.lightbox-close') && e.target !== viewOriginalBtn) {
            closeLightbox();
        }
    });

    // Tìm kiếm
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
});
