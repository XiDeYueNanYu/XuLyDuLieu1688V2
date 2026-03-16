// js/modes/mode3.js
import { Utils } from '../utils.js';

export const mode3 = {
    id: 'mode3',
    name: 'MODE 3 (Tách phiên bản trong ◤ ◥)',
    execute: (cleanedText, inputs) => {
        const products = [];
        
        // 1. CẢI TIẾN: Lấy toàn bộ cụm "价格" cho đến khi gặp Link hoặc ký tự phân cách mạnh
        let globalPriceNote = "";
        const jgKey = "价格";
        const jgIdx = cleanedText.indexOf(jgKey);
        if (jgIdx !== -1) {
            // Lấy nội dung từ sau "价格:" đến trước khi bắt đầu Link ảnh (thường là bắt đầu sản phẩm)
            const contentAfterJg = cleanedText.substring(jgIdx + jgKey.length).trim();
            const nextProductIdx = contentAfterJg.search(/https?:\/\//);
            globalPriceNote = nextProductIdx !== -1 ? contentAfterJg.substring(0, nextProductIdx).trim() : contentAfterJg;
        }

        // Hàm bổ trợ: Tìm giá thấp nhất trong một chuỗi (quét tất cả các ký hiệu ¥)
        const findMinPriceInString = (text) => {
            const priceRegex = /¥\s*([\d.,]+)/g;
            let match;
            let min = Infinity;
            while ((match = priceRegex.exec(text)) !== null) {
                // Thay thế dấu phẩy của Trung Quốc (81,00) thành dấu chấm (81.00) để parse chuẩn
                const num = parseFloat(match[1].replace(/,/g, '.'));
                if (!isNaN(num) && num < min) min = num;
            }
            return min;
        };

        // 2. Tách sản phẩm theo Link ảnh
        const parts = cleanedText.split(/(?=https?:\/\/)/).filter(p => p.trim() !== "");

        parts.forEach(part => {
            const lines = part.trim().split('\n').map(l => l.trim()).filter(l => l !== "");
            
            // Bỏ qua nếu link là detail.1688.com theo logic cũ của bạn
            if (lines.length >= 2 && lines[0].startsWith('http') && !lines[0].includes('detail.1688.com')) {
                const imgLink = lines[0];
                const mainName = lines[1];
                let dirtyPriceLine = lines[2] || ""; 

                // --- Xử lý dấu hiệu ◤ ◥ ---
                const bracketMatch = dirtyPriceLine.match(/◤([\s\S]*?)◥/);
                let contentInBrackets = "";
                if (bracketMatch) {
                    contentInBrackets = bracketMatch[1].trim();
                    dirtyPriceLine = contentInBrackets; 
                }

                // 3. Kiểm tra số lượng biến thể/mức giá trong dòng hiện tại
                const symbolCount = (dirtyPriceLine.match(/¥/g) || []).length;
                const variantRegex = /[^¥\n]+?¥\s*[\d.,]+/g;
                const matches = dirtyPriceLine.match(variantRegex) || [];
                
                let minPrice = Infinity;
                let processedVariants = [];

                if (matches.length > 0) {
                    matches.forEach(item => {
                        processedVariants.push(item.trim());
                        const pMatch = item.match(/¥\s*([\d.,]+)/);
                        if (pMatch) {
                            const num = parseFloat(pMatch[1].replace(/,/g, '.'));
                            if (!isNaN(num) && num < minPrice) minPrice = num;
                        }
                    });
                } else {
                    const single = findMinPriceInString(dirtyPriceLine);
                    if (single !== Infinity) minPrice = single;
                    processedVariants.push(dirtyPriceLine);
                }

                // --- LOGIC ƯU TIÊN GIÁ TỪ CỤM "价格" ---
                // Điều kiện: Nếu chỉ có 1 sản phẩm VÀ (trong ◤◥ chỉ có đúng 1 giá ¥)
                if (parts.length <= 2 && symbolCount === 1 && globalPriceNote) {
                    const minInGlobal = findMinPriceInString(globalPriceNote);
                    if (minInGlobal !== Infinity) {
                        minPrice = minInGlobal; // Ghi đè bằng giá rẻ nhất tìm thấy ở cụm 价格
                    }
                }

                products.push({
                    image: Utils.cleanImageUrl(imgLink),
                    name: mainName,
                    price: minPrice === Infinity ? (inputs.defaultPrice || 0) : minPrice,
                    note: (globalPriceNote ? "Bảng giá gốc:\n" + globalPriceNote + "\n---\n" : "") + processedVariants.join('\n')
                });
            }
        });

        return products;
    }
};