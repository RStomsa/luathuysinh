document.addEventListener("DOMContentLoaded", () => {
    const R2_DOMAIN = "https://pub-7ea26a5215634e0c92af75bd92031d99.r2.dev";
    
    let catalogData = {};
    let currentCategory = "";
    
    // 1. Load Cache Catalog (Sử dụng localStorage để không bị tải lại file json nặng)
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
            .catch(err => console.error("Lỗi load catalog:", err));
    }

    function initApp(catalog) {
        renderSidebar(Object.keys(catalog));
        // Chọn tự động mục đầu tiên
        const firstCategory = Object.keys(catalog)[0];
        if (firstCategory) switchCategory(firstCategory);
    }

    // 2. Menu trái chuẩn Shopee
    function renderSidebar(categories) {
        const sidebar = document.getElementById("sidebar"); // Giả sử có div id="sidebar"
        sidebar.innerHTML = "";
        
        categories.forEach(category => {
            const btn = document.createElement("button");
            btn.className = "sidebar-item"; // CSS style cho menu
            btn.innerHTML = `🌿 ${category}`;
            btn.addEventListener("click", () => switchCategory(category));
            sidebar.appendChild(btn);
        });
    }

    // 3. Hiển thị Gallery ảnh mượt mà bằng Intersection Observer (Lazy load chuẩn)
    function switchCategory(category) {
        currentCategory = category;
        const gallery = document.getElementById("gallery"); // Khung chứa ảnh
        gallery.innerHTML = ""; 

        const images = catalogData[category] || [];
        
        // Dùng DocumentFragment để thêm vào DOM 1 lần duy nhất, chống giật lag
        const fragment = document.createDocumentFragment();

        images.forEach(imgPath => {
            const card = document.createElement("div");
            card.className = "gallery-card"; // CSS bo góc, nền tối...
            
            const img = document.createElement("img");
            // Gán data-src để dùng Intersection Observer
            img.dataset.src = `${R2_DOMAIN}/${encodeURIComponent(imgPath)}`;
            img.alt = imgPath.split('/').pop();
            img.className = "lazy-img"; 
            img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'%3E%3C/svg%3E"; // Skeleton/Blank placeholder cực nhẹ
            
            card.appendChild(img);
            fragment.appendChild(card);
        });

        gallery.appendChild(fragment);
        activeLazyLoad();
    }

    // 4. Kích hoạt Intersection Observer (Chỉ load ảnh khi người dùng cuộn tới)
    function activeLazyLoad() {
        const lazyImages = document.querySelectorAll(".lazy-img");
        
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.onload = () => img.classList.add("loaded");
                    observer.unobserve(img);
                }
            });
        }, { rootMargin: "100px" }); // Tải trước 100px trước khi ảnh lọt vào màn hình

        lazyImages.forEach(img => observer.observe(img));
    }
});
