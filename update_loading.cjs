const fs = require('fs');
const files = ['Telegram.tsx', 'Produtos.tsx', 'Pedidos.tsx', 'PDV.tsx', 'MateriaPrima.tsx', 'Gastos.tsx', 'Estoque.tsx', 'Empresa.tsx', 'Dashboard.tsx', 'Categorias.tsx', 'Cardapio.tsx'];

const repl = `  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (\n    <`;

files.forEach(f => {
    const p = 'src/pages/' + f;
    if (!fs.existsSync(p)) return;
    let c = fs.readFileSync(p, 'utf8');
    
    if (c.includes('animate-spin rounded-full h-12')) {
       return;
    }

    // We also want to remove inline loading cards for cleaner UI if they exist:
    c = c.replace(/\{loading && <Card[^>]+>.*?Carregando.*?<\/Card>\}/g, '');
    c = c.replace(/\{loading && \(\s*<Card.*?Carregando.*?<\/Card>\s*\)\}/g, '');
    
    // Some lines might just be empty now, but that's fine
    
    // Let's find "return (" followed by "<" tags
    const regex = /return\s*\(\s*</;
    
    // We only replace the FIRST occurrence
    let replaced = false;
    c = c.replace(regex, (match) => {
       if (replaced) return match;
       replaced = true;
       return repl;
    });
    
    fs.writeFileSync(p, c);
    console.log("Updated", f);
});
