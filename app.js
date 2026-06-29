document.addEventListener("DOMContentLoaded", () => {
    const R2_DOMAIN = "https://pub-7ea26a5215634e0c92af75bd92031d99.r2.dev";
    
    let catalogData = {};
    let currentCategory = "";
    let loadedImagesCount = 0;
    const BATCH_LOAD = 16;
    let currentImagesList = [];

    const gallery = document.getElementById("gallery");
    const searchBox = document.querySelector(".search-box");

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
        renderTreeMenu(validCategories, catalog);
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

    // 🌟 Dựng Menu cây thư mục đa cấp phân tầng (Nested Tree Menu)
    function renderTreeMenu(categories, catalog) {
        const sidebar = document.getElementById("sidebar");
        sidebar.innerHTML = "";
        
        // Xây dựng cây thư mục từ các Key phân tầng trong catalog
        const tree = {};
        
        categories.forEach(categoryPath => {
            // Tách đường dẫn bằng dấu gạch chéo '/'
            const parts = categoryPath.split('/'); 
            let currentLevel = tree;
            
            parts.forEach((part, index) => {
                if (!currentLevel[part]) {
                    currentLevel[part] = {
                        __path: parts.slice(0, index + 1).join('/'),
                        __isLeaf: index === parts.length - 1,
                        __children: {}
                    };
                }
                currentLevel = currentLevel[part].__children;
            });
        });

        // Đệ quy vẽ cây menu ra Sidebar
        function drawNodes(container, nodes) {
            Object.keys(nodes).forEach(nodeKey => {
                const node = nodes[nodeKey];
                const nodePath = node.__path;
                
                const btn = document.createElement("button");
                btn.className = "sidebar-item";
                btn.style.paddingLeft = `${15 + (nodePath.split('/').length - 1) * 12}px`; // Thụt lề theo cấp độ sâu
                
                const cleanName = nodeKey.replace(/_/g, ' ');
                btn.innerHTML = `${getLeafIconSvg()} <span>${cleanName}</span>`;
                
                // Kiểm tra nếu mục này có ảnh bên trong (là điểm cuối phân loại)
                if (catalog[nodePath] && catalog[nodePath].length > 0) {
                    btn.dataset.category = nodePath;
                    btn.addEventListener("click", () => switchCategory(nodePath));
                    container.appendChild(btn);
                } 
                // Nếu là thư mục trung gian (không chứa ảnh trực tiếp, chỉ chứa thư mục con)
                else if (Object.keys(node.__children).length > 0) {
                    btn.classList.add("folder-node");
                    
                    const iconArrow = document.createElement("span");
                    iconArrow.innerHTML = " ▶";
                    iconArrow.style.fontSize = "10px";
                    iconArrow.style.marginLeft = "auto";
                    btn.appendChild(iconArrow);
                    
                    const subContainer = document.createElement("div");
                    subContainer.className = "folder-children";
                    subContainer.style.display = "none"; // Mặc định ẩn các nút con
                    
                    btn.addEventListener("click", () => {
                        const isVisible = subContainer.style.display === "block";
                        subContainer.style.display = isVisible ? "none" : "block";
                        iconArrow.innerHTML = isVisible ? " ▶" : " ▼";
                    });
                    
                    container.appendChild(btn);
                    container.appendChild(subContainer);
                    drawNodes(subContainer, node.__children);
                    return;
                }
                
                container.appendChild(btn);
            });
        }

        drawNodes(sidebar, tree);
    }

    function switchCategory(category) {
        document.querySelectorAll(".sidebar-item").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.category === category);
        });

        currentCategory = category;
        currentImagesList = catalogData[category] || [];
        loadedImagesCount = 0;
        gallery.innerHTML = ""; 
        
        gallery.scrollTo(0, 0);
        loadMoreImages();
    }

    // Vô hạn cuộn (Infinite Scroll) load ảnh thông minh
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
            
            card.addEventListener("click", () => openLightbox(fullR2Url, item.id));
            
            card.appendChild(img);
            fragment.appendChild(card);
        });

        gallery.appendChild(fragment);
        activeLazyLoadImages();
        loadedImagesCount += BATCH_LOAD;
    }

    gallery.addEventListener("scroll", () => {
        if (gallery.scrollTop + gallery.clientHeight >= gallery.scrollHeight - 150) {
            loadMoreImages();
        }
    });

    function LazyLoadImages() {
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

    // Lightbox xem ảnh to kèm nút xem file gốc Drive
    const lightbox = document.getElementById("lightbox");
    const lightboxImg = document.getElementById("lightboxImg");
    const closeBtn = document.querySelector(".lightbox-close");
    
    let viewOriginalBtn = document.getElementById("viewOriginalBtn");
    if (!viewOriginalBtn) {
        viewOriginalBtn = document.createElement("a");
        viewOriginalBtn.id = "viewOriginalBtn";
        viewOriginalBtn.className = "lightbox-view-original";
        viewOriginalBtn.target = "_blank";
        viewOriginalBtn.innerHTML = "📂 Xem file gốc trên Drive";
        lightbox.appendChild(viewOriginalBtn);
        
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
        if (e.target !== lightboxImg && !e.target.closest('.lightbox-close') && e.target !== viewOriginalBtn) {
            closeLightbox();
        }
    });

    // Thanh tìm kiếm
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
