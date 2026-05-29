interface StorefrontProduct {
  name: string;
  description?: string | null;
  finalPrice: number;
  imageUrl?: string | null;
}

export function renderStorefront(storeName: string, products: StorefrontProduct[]): string {
  const productCards = products
    .map(
      (p) => `
    <div class="bg-[#131a26] border border-[#1e293b] rounded-xl p-5 flex flex-col justify-between hover:border-[#4f46e5] transition-all">
      <div>
        <div class="w-full h-48 rounded-lg bg-[#0b0f19] mb-4 overflow-hidden border border-[#1e293b] flex items-center justify-center">
          ${p.imageUrl
            ? `<img src="${p.imageUrl}" alt="${p.name}" class="w-full h-full object-cover">`
            : `<svg class="w-12 h-12 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 002-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>`
          }
        </div>
        <h3 class="text-base font-bold text-white mb-1">${p.name}</h3>
        <p class="text-xs text-slate-400 mb-2">${p.description || "Sem descrição disponível."}</p>
      </div>
      <div class="flex justify-between items-center mt-4 pt-4 border-t border-[#1e293b]">
        <span class="font-mono text-base font-bold text-[#38bdf8]">${p.finalPrice.toFixed(2)} MT</span>
        <button class="bg-[#4f46e5] hover:bg-[#3730a3] text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors">
          Comprar 🛒
        </button>
      </div>
    </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${storeName} | Powered by HWS</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap" rel="stylesheet">
  <style>body { font-family: 'Inter', sans-serif; }</style>
</head>
<body class="bg-[#0b0f19] text-[#f8fafc] min-h-screen p-6">
  <header class="max-w-6xl mx-auto mb-10 flex justify-between items-center border-b border-[#1e293b] pb-6">
    <h1 class="text-2xl font-black tracking-tight text-white uppercase">${storeName}</h1>
    <span class="text-xs text-slate-500 bg-[#131a26] border border-[#1e293b] px-3 py-1.5 rounded-md font-mono">Secure SSL Active</span>
  </header>
  <main class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
    ${productCards.length > 0 ? productCards : '<p class="col-span-3 text-center text-slate-500 text-sm py-12">Esta montra ainda não tem produtos com fotos registadas.</p>'}
  </main>
</body>
</html>`;
}
