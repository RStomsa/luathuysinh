document.addEventListener("DOMContentLoaded", () => {
    const R2_DOMAIN = "https://pub-7ea26a5215634e0c92af75bd92031d99.r2.dev";
    
    let catalogData = {};
    let currentCategory = "";
    let loadedImagesCount = 0;
    const BATCH_LOAD = 16;
    let currentImagesList = [];

    const gallery = document.getElementById("gallery");
    const searchBoxSearch = document.querySelector(".search-box");

    // 1. Tải Cache Catalog
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
                initApp(catalogData);
            })
            .catch(err => console.error("Lỗi tải catalog:", err));
    }

    function initApp(catalog) {
        // Lọc bỏ các thư mục rỗng
        const validCategories = Object.keys(catalog).filter(key => catalog[key] && catalog[key].length > 0);
        renderSidebar(validCategories);
        if (validCategories.length > 0) {
            switchCategory(validCategories[0]);
        }
    }

    // 2. Sidebar menu cố định
    function renderSidebar(categories) {
        const sidebar = document.getElementById("sidebar");
        sidebar.innerHTML = "";
        
        categories.forEach(category => {
            const btn = document.createElement("button");
            btn.className = "sidebar-item";
            // Lọc tên thư mục ngắn gọn (bỏ bớt tiền tố đường dẫn nếu có)
            const shortName = category.split('/').pop();
            btn.innerHTML = `🌿 ${shortName}`;
            btn.dataset.category = category;
            
            btn.addEventListener("click", () => switchCategory(category));
            sidebar.appendChild(btn);
        });
    }

    // Chuyển đổi danh mục rõ ràng
    function switchCategory(category) {
        document.querySelectorAll(".sidebar-item").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.category === category);
        });

        currentCategory = category;
        currentImagesList = catalogData[category] || [];
        loadedImagesCount = 0;
        gallery.innerHTML = ""; 
        
        loadMoreImages();
    }

    // 3. Infinite scroll nạp ảnh
    function loadMoreImages() {
        const imagesToLoad = currentImagesList.slice(loadedImagesCount, loadedImagesCount + BATCH_LOAD);
        if (imagesToLoad.length === 0) return;

        const fragment = document.createDocumentFragment();

        imagesToLoad.forEach(imgPath => {
            const card = document.createElement("div");
            card.className = "gallery-card";
            
            const img = document.createElement("img");
            img.dataset.src = `${R2_DOMAIN}/${encodeURIComponent(imgPath)}`;
            img.alt = imgPath.split('/').pop();
            img.className = "lazy-img";
            img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E";
            
            // Kích hoạt bấm phóng to ảnh
            card.addEventListener("click", () => openLightbox(`${R2_DOMAIN}/${encodeURIComponent(imgPath)}`));
            
            card.appendChild(img);
            fragment.appendChild(card);
        });

        gallery.appendChild(fragment);
        activeLazyLoad();
        loadedImagesCount += BATCH_LOAD;
    }

    // Lắng nghe sự kiện cuộn gallery
    gallery.addEventListener("scroll", () => {
        if (gallery.scrollTop + gallery.clientHeight >= gallery.scrollHeight - 100) {
            loadMoreImages();
        }
    });

    // Lazy Loading
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
        }, { root: gallery, rootMargin: "150px" });

        lazyImages.forEach(img => observer.observe(img));
    }

    // 4. Khung Lightbox xem chi tiết
    const lightbox = document.getElementById("lightbox");
    const lightboxImg = document.getElementById("lightboxImg");
    const closeBtn = document.querySelector(".lightbox-close");

    function openLightbox(imgSrc) {
        lightboxImg.src = imgSrc;
        lightbox.classList.add("active");
        document.body.style.overflow = 'hidden'; // Khóa cuộn trang nền khi đang xem ảnh to
    }

    function closeLightbox() {
        lightbox.classList.remove("active");
        setTimeout(() => { lightboxImg.src = ""; }, 300);
        document.body.style.overflow = ''; // Trả lại quyền cuộn trang
    }

    closeBtn.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", (e) => {
        if (e.target !== lightboxImg) closeLightbox();
    });

    // 5. Tìm kiếm đơn giản
    const searchBox = document.querySelector(".search-box");
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
