
  
    // 1. IMPORTS NO TOPO DO ARQUIVO
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 2. CONFIGURAÇÃO DO FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyABjo1wgqUp-dnoGtOtGbPvgF6W8C5tSLQ",
    authDomain: "adm-barbearia-vitrine.firebaseapp.com",
    projectId: "adm-barbearia-vitrine",
    storageBucket: "adm-barbearia-vitrine.firebasestorage.app",
    messagingSenderId: "771653959817",
    appId: "1:771653959817:web:710a74a30ee5fd288bc658",
    measurementId: "G-B1YXKLB4RK"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const productsRef = collection(db, "produtos");

// Lista de produtos dinâmica que virá do Firebase
let produtos = [];

document.addEventListener("DOMContentLoaded", () => {
    // --- SELETORES GLOBAIS ---
    const cartIcon = document.querySelector(".cart-icon"),
        cartSidebar = document.querySelector(".cart-sidebar"),
        cartOverlay = document.querySelector(".cart-overlay"),
        closeCartBtn = document.querySelector(".close-cart-btn"),
        cartBody = document.querySelector(".cart-body"),
        cartBadge = document.querySelector(".cart-badge");
    const deliveryToggleBtns = document.querySelectorAll(".delivery-btn");
    const deliveryForm = document.getElementById("delivery-form-container"),
        pickupForm = document.getElementById("pickup-form-container");
    const trocoContainer = document.getElementById("troco-container");
    const couponInput = document.getElementById("coupon-input"),
        applyCouponBtn = document.getElementById("apply-coupon-btn"),
        couponFeedback = document.getElementById("coupon-feedback");
    const subtotalElem = document.getElementById("cart-subtotal"),
        cartDiscountElem = document.getElementById("cart-discount"),
        discountLineElem = document.querySelector(".discount-line"),
        totalElem = document.getElementById("cart-total");
    const finishOrderBtn = document.getElementById("finish-order-btn");
    
    // Seletores da barra inferior
    const viewCartBanner = document.querySelector(".view-cart-banner");
    const bannerTotalElem = document.getElementById("banner-total");
    const viewCartBannerBtn = document.querySelector(".view-cart-banner-btn");

    // Seletores para o sistema de filtro
    const categoryBtns = document.querySelectorAll(".category-btn");
    const searchInput = document.querySelector(".search-input");

    // ESTADO DA APLICAÇÃO
    const validCoupons = [{ code: "DESCONTO10", type: "percentage", value: 10 }];
    let carrinho = [],
        tipoEntrega = "delivery",
        appliedCoupon = null;

    let categoriaAtiva = "all";
    let termoBusca = "";

    const formatarMoeda = (v) =>
        (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    
    const getScrollbarWidth = () =>
        window.innerWidth - document.documentElement.clientWidth;
    
    const lockScroll = () => {
        document.body.style.paddingRight = `${getScrollbarWidth()}px`;
        document.body.classList.add("no-scroll");
    };
    
    const unlockScroll = () => {
        document.body.style.paddingRight = "";
        document.body.classList.remove("no-scroll");
    };
    
    const abrirCarrinho = () => {
        cartSidebar.classList.add("show");
        cartOverlay.classList.add("show");
        lockScroll();
    };
    
    const fecharCarrinho = () => {
        cartSidebar.classList.remove("show");
        cartOverlay.classList.remove("show");
        unlockScroll();
    };

    const animacaoVoarParaCarrinho = (productCard) => {
        const productImg = productCard.querySelector(".product-img");
        if (!productImg) return;
        
        const imgRect = productImg.getBoundingClientRect(),
            cartRect = cartIcon.getBoundingClientRect(),
            flyingImg = document.createElement("img");
        flyingImg.src = productImg.src;
        flyingImg.classList.add("product-image-fly");
        flyingImg.style.left = `${imgRect.left}px`;
        flyingImg.style.top = `${imgRect.top}px`;
        flyingImg.style.width = `${imgRect.width}px`;
        flyingImg.style.height = `${imgRect.height}px`;
        document.body.appendChild(flyingImg);
        
        requestAnimationFrame(() => {
            flyingImg.style.left = `${cartRect.left + cartRect.width / 2}px`;
            flyingImg.style.top = `${cartRect.top + cartRect.height / 2}px`;
            flyingImg.style.width = "0px";
            flyingImg.style.height = "0px";
            flyingImg.style.opacity = "0";
        });
        flyingImg.addEventListener("transitionend", () => flyingImg.remove());
    };

    // Função para filtrar e mostrar produtos (Compatível com os nomes vindos da Dashboard)
 
// BUSCA EM TEMPO REAL NO FIREBASE
onSnapshot(productsRef, (snapshot) => {
    produtos = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            nome: data.name || data.nome || 'Produto sem nome',
            categoria: data.category || data.categoria || 'geral',
            preco: Number(data.price || data.preco || 0),
            // Adicionado suporte ao Preço Antigo vindo da Dashboard:
            precoAntigo: data.oldPrice || data.precoAntigo ? Number(data.oldPrice || data.precoAntigo) : null,
            estoque: Number(data.stock ?? data.estoque ?? 0),
            imagem: data.image || data.imagem || '',
            descricao: data.desc || data.descricao || ''
        };
    });

    filtrarEMostrarProdutos();
}, (error) => {
    console.error("Erro ao buscar produtos do Firestore:", error);
});


// 2. Filtro alterado para remover produtos com estoque <= 0
const filtrarEMostrarProdutos = () => {
    let produtosFiltrados = produtos;

    // REGRA NOVO: Oculta do index produtos sem estoque (estoque igual ou menor que 0)
    produtosFiltrados = produtosFiltrados.filter(produto => produto.estoque > 0);

    // Filtro por categoria
    if (categoriaAtiva !== "all") {
        produtosFiltrados = produtosFiltrados.filter(
            (produto) => produto.categoria === categoriaAtiva
        );
    }

    // Filtro por busca
    if (termoBusca.trim() !== "") {
        const termo = termoBusca.toLowerCase();
        produtosFiltrados = produtosFiltrados.filter(
            (produto) =>
                (produto.nome && produto.nome.toLowerCase().includes(termo)) ||
                (produto.descricao && produto.descricao.toLowerCase().includes(termo))
        );
    }

    // Renderizar produtos
    const container = document.querySelector(".products-container");
    if (!container) return;

    if (produtosFiltrados.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #999;">
                <i class="fa-solid fa-box-open" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <p style="font-size: 1.2rem; font-weight: 600;">Nenhum produto disponível no momento</p>
            </div>
        `;
    } else {
       container.innerHTML = produtosFiltrados
    .map(
        (p) => 
        `
            <div class="product-card" data-id="${p.id}">
                <img class="product-img" src="${p.imagem}" alt="${p.nome}" onerror="this.src='https://placehold.co/300x300?text=Sem+Imagem'">
                <div class="product-info">
                    <h3 class="product-name">${p.nome}</h3>
                    <p class="product-description">${p.descricao || ''}</p>
                    
                    <p class="product-stock" style="font-size: 0.8rem; color: #10b981; font-weight: 600; margin-bottom: 4px;">
                        Restam ${p.estoque} unidade(s)
                    </p>
                    
                    <!-- EXIBIÇÃO DE PREÇO ANTIGO E PREÇO ATUAL -->
                    <div class="product-price-wrapper" style="margin-bottom: 1rem; display:flex;flex-direction:column;justify-content:space-between ">
                        ${p.precoAntigo ? `<span class="product-price-old" style="  text-decoration: line-through; color: #9ca3af; font-size: 0.9rem; margin-right: 8px;">${formatarMoeda(p.precoAntigo)}</span>` : ''}
                        <span class="product-price" style="font-size: 1.35rem; color: var(--primary-color); font-weight: 800;">${formatarMoeda(p.preco)}</span>
                    </div>

                    <button class="product-button">Comprar</button>
                </div>
            </div>
        `
    )
    .join("");
    }
};

    const adicionarAoCarrinho = (produtoId, productCard) => {
        if (productCard) animacaoVoarParaCarrinho(productCard);
        const produto = produtos.find((p) => String(p.id) === String(produtoId)),
            itemNoCarrinho = carrinho.find((item) => String(item.id) === String(produtoId));
        
        if (!produto) return;

        if (itemNoCarrinho) itemNoCarrinho.quantidade++;
        else carrinho.push({ ...produto, quantidade: 1 });
        atualizarCarrinho();
    };

    const alterarQuantidade = (produtoId, acao) => {
        const item = carrinho.find((i) => String(i.id) === String(produtoId));
        if (!item) return;
        if (acao === "aumentar") item.quantidade++;
        else if (acao === "diminuir") {
            item.quantidade--;
            if (item.quantidade <= 0)
                carrinho = carrinho.filter((i) => String(i.id) !== String(produtoId));
        }
        atualizarCarrinho();
    };

    const atualizarCarrinho = () => {
        if (carrinho.length === 0) {
            cartBody.innerHTML = `<div class="cart-empty"><i class="fa-solid fa-box-open"></i><p>Seu carrinho está vazio.</p></div>`;
        } else {
            cartBody.innerHTML = carrinho
                .map(
                    (item) =>
                        `<div class="cart-item" data-id="${item.id}">
                            <img src="${item.imagem}" alt="${item.nome}" class="cart-item-img">
                            <div class="cart-item-info">
                                <h4 class="cart-item-name">${item.nome}</h4>
                                <p class="cart-item-price">${formatarMoeda(item.preco)}</p>
                                <div class="cart-item-controls">
                                    <button class="quantity-btn" data-action="diminuir">-</button>
                                    <span class="quantity">${item.quantidade}</span>
                                    <button class="quantity-btn" data-action="aumentar">+</button>
                                </div>
                            </div>
                            <button class="remove-item-btn">&times;</button>
                        </div>`
                )
                .join("");
        }
        
        const subtotal = carrinho.reduce(
            (acc, item) => acc + item.preco * item.quantidade,
            0
        );
        let discountAmount = 0;
        if (appliedCoupon && appliedCoupon.type === "percentage")
            discountAmount = subtotal * (appliedCoupon.value / 100);
        
        const total = subtotal - discountAmount;
        subtotalElem.textContent = formatarMoeda(subtotal);
        
        if (discountAmount > 0) {
            cartDiscountElem.textContent = `- ${formatarMoeda(discountAmount)}`;
            discountLineElem.style.display = "flex";
        } else {
            discountLineElem.style.display = "none";
        }
        
        totalElem.textContent = formatarMoeda(total);
        cartBadge.textContent = carrinho.reduce(
            (acc, item) => acc + item.quantidade,
            0
        );
        finishOrderBtn.disabled = carrinho.length === 0;

        if (carrinho.length > 0 && window.innerWidth <= 768) {
            bannerTotalElem.textContent = formatarMoeda(total);
            viewCartBanner.classList.add("show");
        } else {
            viewCartBanner.classList.remove("show");
        }
    };

    const applyCoupon = () => {
        const code = couponInput.value.trim().toUpperCase(),
            foundCoupon = validCoupons.find((c) => c.code === code);
        couponFeedback.classList.remove("success", "error");
        if (foundCoupon) {
            appliedCoupon = foundCoupon;
            couponFeedback.textContent = "Cupom aplicado!";
            couponFeedback.classList.add("success");
        } else {
            appliedCoupon = null;
            couponFeedback.textContent = "Cupom inválido.";
            couponFeedback.classList.add("error");
        }
        atualizarCarrinho();
    };

const finalizarPedido = () => {
        let valid = true;
        let fieldsToValidate = [];
        let firstInvalidField = null;

        if (tipoEntrega === "delivery") {
            fieldsToValidate = [
                "delivery-name",
                "delivery-phone",
                "delivery-cep",
                "delivery-address",
            ];
        } else {
            fieldsToValidate = ["pickup-name", "pickup-date", "pickup-time"];
        }

        fieldsToValidate.forEach((id) => {
            const el = document.getElementById(id);
            let isFieldValid = el.value.trim() !== "";

            // Validação do campo de nome: aceita se tiver pelo menos 2 caracteres no total ou 2 palavras
            if (id.includes("name") && isFieldValid) {
                const nameValue = el.value.trim();
                const words = nameValue.split(/\s+/).filter(Boolean);
                
                // Exige pelo menos 2 caracteres no total (para nomes sem espaço) ou 2+ palavras
                if (nameValue.length < 2 && words.length < 2) {
                    isFieldValid = false;
                }
            }

            if (!isFieldValid) {
                el.classList.add("error");
                valid = false;
                if (!firstInvalidField) {
                    firstInvalidField = el;
                }
            } else {
                el.classList.remove("error");
            }
        });

        if (!valid) {
            if (firstInvalidField) {
                firstInvalidField.scrollIntoView({ behavior: "smooth", block: "center" });
                firstInvalidField.focus();
            }
            return;
        }

        const numeroWhatsApp = "558182362638";
        const itensPedido = carrinho
            .map((item) => `  - ${item.quantidade}x ${item.nome}`)
            .join("\n");
        const subtotal = carrinho.reduce(
            (acc, item) => acc + item.preco * item.quantidade,
            0
        );
        let discountAmount = 0,
            cupomInfo = "";
        if (appliedCoupon) {
            discountAmount = subtotal * (appliedCoupon.value / 100);
            cupomInfo = `\n*Cupom Aplicado:* ${appliedCoupon.code} (${formatarMoeda(discountAmount)})`;
        }
        const total = subtotal - discountAmount;
        let mensagem = `*-- NOVO PEDIDO RA Perfumes --*\n\n*Itens:*\n${itensPedido}\n\n*Subtotal:* ${formatarMoeda(subtotal)}${cupomInfo}\n*Total:* ${formatarMoeda(total)}\n\n-------------------------\n\n`;

        if (tipoEntrega === "delivery") {
            const nome = document.getElementById("delivery-name").value;
            const phone = document.getElementById("delivery-phone").value;
            const address = document.getElementById("delivery-address").value;

            const paymentMethod = document.querySelector(
                'input[name="payment"]:checked'
            ).value;
            let paymentInfo = `*Forma de Pagamento:* ${paymentMethod}`;
            if (paymentMethod === "Dinheiro") {
                const troco = document.getElementById("troco-para").value;
                paymentInfo += troco
                    ? ` (Troco para R$ ${troco})`
                    : " (Não precisa de troco)";
            }
            mensagem += `*Tipo de Pedido:* Entrega\n\n*Nome:* ${nome}\n*Telefone:* ${phone}\n*Endereço:* ${address}\n\n${paymentInfo}`;
        } else {
            const nome = document.getElementById("pickup-name").value;
            const dataInput = document.getElementById("pickup-date").value;
            const hora = document.getElementById("pickup-time").value;
            const [year, month, day] = dataInput.split("-");
            const dataFormatada = `${day}/${month}/${year}`;

            mensagem += `*Tipo de Pedido:* Retirada\n\n*Nome para Retirada:* ${nome}\n*Data Agendada:* ${dataFormatada}\n*Hora Agendada:* ${hora}`;
        }

        const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`;
        window.open(url, "_blank");
    };

    // --- EVENT LISTENERS ---
    cartIcon.addEventListener("click", abrirCarrinho);
    closeCartBtn.addEventListener("click", fecharCarrinho);
    cartOverlay.addEventListener("click", fecharCarrinho);
    applyCouponBtn.addEventListener("click", applyCoupon);
    finishOrderBtn.addEventListener("click", finalizarPedido);
    viewCartBannerBtn.addEventListener("click", abrirCarrinho);

    categoryBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            categoryBtns.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            categoriaAtiva = btn.dataset.category;
            filtrarEMostrarProdutos();
        });
    });

    searchInput.addEventListener("input", (e) => {
        termoBusca = e.target.value;
        filtrarEMostrarProdutos();
    });

    document.querySelector(".products-container").addEventListener("click", (e) => {
        if (e.target.matches(".product-button")) {
            const productCard = e.target.closest(".product-card");
            adicionarAoCarrinho(productCard.dataset.id, productCard);
        }
    });

    cartBody.addEventListener("click", (e) => {
        const cartItem = e.target.closest(".cart-item");
        if (cartItem) {
            const produtoId = cartItem.dataset.id;
            if (e.target.matches(".quantity-btn"))
                alterarQuantidade(produtoId, e.target.dataset.action);
            if (e.target.matches(".remove-item-btn")) {
                carrinho = carrinho.filter((i) => String(i.id) !== String(produtoId));
                atualizarCarrinho();
            }
        }
    });

    deliveryToggleBtns.forEach((btn) =>
        btn.addEventListener("click", () => {
            deliveryToggleBtns.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            tipoEntrega = btn.dataset.option;
            if (tipoEntrega === "delivery") {
                deliveryForm.style.display = "block";
                pickupForm.style.display = "none";
            } else {
                deliveryForm.style.display = "none";
                pickupForm.style.display = "block";
            }
        })
    );

    document.querySelectorAll('input[name="payment"]').forEach((radio) => {
        radio.addEventListener("change", (e) => {
            trocoContainer.style.display =
                e.target.value === "Dinheiro" ? "block" : "none";
            document
                .querySelectorAll(".payment-option")
                .forEach((label) => label.classList.remove("selected"));
            e.target.closest(".payment-option").classList.add("selected");
        });
    });

    document
        .querySelectorAll(
            "#delivery-form-container input[required], #pickup-form-container input[required], #pickup-form-container select[required]"
        )
        .forEach((input) => {
            input.addEventListener("input", () => {
                if (input.value.trim() !== "") input.classList.remove("error");
            });
        });

    atualizarCarrinho();
});
