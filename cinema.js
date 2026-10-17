/* cinema.js — ARCO Cinema 2.0: biblioteca de filmes com ARQUIVOS LOCAIS (IndexedDB) + reprodutor integrado.
   Integra com o ARCO como o antigo cinema.js: registra a página em PG/P e usa S, sv(), RD(), esc(), $ e uid() do ARCO.

   CORREÇÃO (seletor de arquivos)
   - Causa: o campo de vídeo usava accept="video/*,..." e, no Android/iOS, um accept composto só por tipos de mídia faz o navegador
     abrir o seletor de GALERIA (fotos/vídeos da galeria), não o gerenciador de arquivos (Downloads, Drive do aparelho, cartão SD).
     O campo ficava dentro de um <input hidden> (display:none), o que também é menos confiável em alguns navegadores móveis.
   - Correção: (1) o campo de vídeo continua com accept="video/*,.mp4,.webm,.m4v,..." (nunca image/*); (2) foi adicionado um segundo
     caminho, "Procurar em todos os arquivos", que abre o seletor de arquivos do sistema sem filtro de mídia; (3) o arquivo escolhido
     é validado pelo tipo, pela extensão E pela assinatura binária (magic bytes) antes de importar, e depois pela decodificação real
     (probe); imagens e arquivos que não são vídeo são recusados com mensagem clara; (4) a capa continua em um seletor separado
     (accept="image/*"); (5) links de compartilhamento do Google Drive deixam de ser tratados como arquivo de vídeo.
   - Google Drive: NÃO há integração com o Drive neste módulo. Veja a nota em "GOOGLE DRIVE" mais abaixo.

   DADOS
   - Metadados (leves, exportáveis): S.cine = { movies:[], prog:{id:{t,d,u,done}}, seen:{id:ts} }  (mesmo formato de antes;
     campos novos por filme: fileName, fileSize, fileType, hasCover). Entram no Exportar/Importar do ARCO.
   - Arquivos de vídeo (binários): IndexedDB "arco-cinema" (neste aparelho). O vídeo é gravado em pedaços de 8 MB
     (store "chunks"), com um registro final em "files" que marca a importação como completa. Capas e legendas ficam em "assets".
   - localStorage 'hub_cine_pref' = volume/velocidade/legenda (preferências só deste aparelho).
   - Filmes cadastrados na versão antiga (campo url) continuam tocando pelo link; novos filmes NÃO usam link.

   SINCRONIZAÇÃO
   - IndexedDB/localStorage NÃO sincronizam entre aparelhos. O que já existia continua: metadados e progresso trafegam pelo
     canal de aparelhos pareados do Hub (SY). Os ARQUIVOS DE VÍDEO NÃO trafegam: ficam só no aparelho onde foram importados.
     Num aparelho que recebeu só os metadados o filme aparece como "Sem arquivo" e dá para anexar o arquivo (ou usar "Baixar arquivo"
     no aparelho de origem para levar o vídeo manualmente).
   - Para o futuro (servidor/nuvem) existe um ponto de extensão sem API inventada: window.ARCO_CINEMA_SYNC.register(adapter).
     Veja o bloco "SINCRONIZAÇÃO FUTURA" mais abaixo. Sem adapter registrado, nada é enviado para fora do aparelho.

   GOOGLE DRIVE (não implementado)
   - Não existe integração real com o Drive aqui, e nenhuma credencial é simulada. Uma URL de compartilhamento do Drive
     (drive.google.com/file/d/…/view) é uma PÁGINA HTML, não um arquivo de vídeo: não toca em <video> e é recusada com aviso.
   - Hoje: baixe o vídeo do Drive para o aparelho (app Drive → Baixar / “Disponibilizar offline” e salvar em Downloads) e escolha
     o arquivo pelo botão “Procurar em todos os arquivos”.
   - Para integrar de verdade seriam necessários: (a) um projeto no Google Cloud com a Drive API ativada; (b) tela de consentimento
     OAuth 2.0 e um OAuth Client ID do tipo Web (origens autorizadas = o domínio do ARCO); (c) autenticação com Google Identity
     Services (token client) pedindo o escopo mínimo https://www.googleapis.com/auth/drive.file (ou drive.readonly, que é
     “restrito” e exige verificação do app); (d) o Google Picker API (com chave de API restrita ao domínio) para o usuário escolher
     os vídeos; (e) baixar o conteúdo com files.get?alt=media + header Authorization: Bearer <token> (os binários vêm por fetch,
     em pedaços com Range, e entram no mesmo Store.put do IndexedDB); (f) tratamento de CORS, expiração do token e cotas.
     Sem esses componentes (ou um backend próprio), não é possível ler o Drive de dentro do navegador.

   Use apenas conteúdo próprio, de domínio público ou que você tenha autorização para reproduzir. */
(() => {
  if (typeof PG === 'undefined' || typeof P === 'undefined' || typeof S === 'undefined' || typeof esc !== 'function') return;
  if (window.CN && window.CN.v === 2) return;
  if (!PG.some(p => p[0] === 'cin')) {
    const i = PG.findIndex(p => p[0] === 'cfg');
    PG.splice(i < 0 ? PG.length : i, 0, ['cin', 'play', 'ARCO Cinema']);
  }

  /* ================= CSS (tudo com prefixo cn-, #cnp, #md .box.cn-form ou #cn-css) ================= */
  if (!document.getElementById('cn-css')) {
    const css = document.createElement('style');
    css.id = 'cn-css';
    css.textContent = `
.cn-root,#md .box.cn-form,#cnp{--cn-red:#E50914;--cn-red2:#f6121d;--cn-bg:#0b0b0b;--cn-bg2:#141414;--cn-card:#1c1c1c;--cn-hi:#2a2a2a;--cn-bd:#333;--cn-tx:#fff;--cn-t2:#b3b3b3;--cn-ok:#46d369;--cn-er:#ff6b6b;--cn-wa:#f5a623}
.cn-root{background:linear-gradient(180deg,#1a1a1a 0,#0b0b0b 460px);color:var(--cn-tx);border-radius:16px;padding:16px 14px 22px;min-height:70vh}
.cn-root *,#md .box.cn-form *{box-sizing:border-box}
.cn-i{width:1.2em;height:1.2em;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:none;vertical-align:-.2em;pointer-events:none}
.cn-hd{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 14px}
.cn-hd h1{margin:0;font-size:clamp(22px,5vw,30px);font-weight:800;letter-spacing:-.02em}
.cn-hd h1 b{color:var(--cn-red)}
.cn-btn,.cn-bw,.cn-bg{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:42px;padding:0 18px;border:0;border-radius:6px;font:inherit;font-size:15px;font-weight:700;cursor:pointer;white-space:nowrap;transition:background .15s,transform .1s}
.cn-btn{background:var(--cn-red);color:#fff}
.cn-btn:hover{background:var(--cn-red2)}
.cn-btn.g{background:#ffffff1f;color:#fff}
.cn-btn.g:hover{background:#ffffff36}
.cn-btn.sm{min-height:34px;padding:0 13px;font-size:13px}
.cn-btn:disabled,.cn-bw:disabled{opacity:.5;cursor:default}
.cn-bw{background:#fff;color:#000}
.cn-bw:hover{background:#ffffffc7}
.cn-bg{background:#6d6d6eb3;color:#fff}
.cn-bg:hover{background:#6d6d6e73}
.cn-bg.er{color:#ff8a83}
.cn-btn:active,.cn-bw:active{transform:scale(.97)}
.cn-root button:focus-visible,.cn-root input:focus-visible,#md .box.cn-form :focus-visible,.cn-drop:focus-visible{outline:2px solid #fff;outline-offset:2px}
.cn-ib{background:#ffffff1f;border:0;color:#fff;width:40px;height:40px;border-radius:50%;display:inline-grid;place-items:center;cursor:pointer;font-size:18px}
.cn-bar{margin-bottom:12px}
.cn-search{display:flex;align-items:center;gap:8px;height:44px;padding:0 14px;background:#ffffff14;border:1px solid transparent;border-radius:8px;color:var(--cn-t2)}
.cn-search:focus-within{border-color:#ffffff66}
.cn-search input{flex:1;min-width:0;height:42px;padding:0;border:0;background:transparent;color:#fff;outline:0;font:inherit;box-shadow:none}
.cn-chips{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}
.cn-chips::-webkit-scrollbar{display:none}
.cn-chip{flex:none;border:0;background:#ffffff1a;color:#fff;font:inherit;font-size:13px;font-weight:600;padding:7px 14px;border-radius:999px;cursor:pointer}
.cn-chip.on{background:var(--cn-red)}
.cn-sec{margin-top:24px}
.cn-sec h2{margin:0 0 4px;font-size:18px;font-weight:700}
.cn-rw{position:relative}
.cn-row{display:flex;gap:12px;overflow-x:auto;padding:16px 2px 18px;scroll-snap-type:x proximity;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.cn-row::-webkit-scrollbar{display:none}
.cn-row>*{flex:none;scroll-snap-align:start}
.cn-row>.cn-card{width:138px}
.cn-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:18px 12px}
.cn-card{position:relative;display:flex;flex-direction:column;gap:6px;min-width:0;padding:0;border:0;background:none;color:#fff;text-align:left;cursor:pointer;font:inherit}
.cn-card:hover,.cn-card:focus-visible{z-index:2}
.cn-cv{position:relative;display:block;aspect-ratio:2/3;border-radius:6px;overflow:hidden;background:linear-gradient(160deg,hsl(var(--h,0) 12% 24%),hsl(var(--h,0) 12% 10%));transition:transform .18s,box-shadow .18s}
.cn-card:hover .cn-cv{transform:scale(1.07);box-shadow:0 14px 30px #000a}
.cn-cv img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.cn-ph{position:absolute;inset:0;display:grid;place-items:center;font-size:30px;font-weight:800;color:#ffffff66}
.cn-pg{position:absolute;left:0;right:0;bottom:0;height:4px;background:#000a}
.cn-pg b{display:block;height:100%;background:var(--cn-red)}
.cn-sb{position:absolute;top:6px;right:6px;width:22px;height:22px;display:grid;place-items:center;border-radius:50%;background:#000b;color:#F5C451;font-size:12px}
.cn-tag{position:absolute;left:6px;top:6px;background:#000c;color:var(--cn-wa);font-size:10.5px;font-weight:700;padding:3px 7px;border-radius:4px}
.cn-ct{font-size:14px;font-weight:600;line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
.cn-mt{font-size:12.5px;color:var(--cn-t2);min-height:1em}
.cn-count{margin:0 0 12px;font-size:13px;color:var(--cn-t2)}
.cn-ar{position:absolute;top:16px;bottom:18px;z-index:3;width:44px;border:0;padding:0;display:none;place-items:center;color:#fff;cursor:pointer;background:linear-gradient(90deg,#000b,transparent);opacity:0;transition:opacity .15s}
.cn-ar.r{right:0;background:linear-gradient(270deg,#000b,transparent)}
.cn-ar.l{left:0}
@media(hover:hover) and (min-width:761px){.cn-ar{display:grid}.cn-rw:hover .cn-ar{opacity:1}}
.cn-hero{position:relative;isolation:isolate;overflow:hidden;display:flex;align-items:flex-end;min-height:clamp(360px,58vh,580px);margin:0 0 6px;border-radius:12px;background:#050505}
.cn-hb{position:absolute;inset:0;z-index:-2;background:linear-gradient(135deg,hsl(var(--h,0) 14% 18%),#060606);overflow:hidden}
.cn-hb::before{content:"";position:absolute;inset:-30px;background:var(--cv,none) center/cover;filter:blur(30px) saturate(1.2);opacity:.6}
.cn-hb::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,#050505f0 10%,#05050566 62%,#05050514),linear-gradient(0deg,#0b0b0b 0,#0000 34%)}
.cn-hp{position:absolute;z-index:-1;right:6%;top:7%;height:80%;aspect-ratio:2/3;object-fit:cover;border-radius:8px;box-shadow:0 22px 56px #000a}
.cn-hx{display:flex;flex-direction:column;gap:12px;max-width:min(580px,100%);padding:clamp(18px,4vw,46px)}
.cn-hk{font-size:12px;font-weight:800;letter-spacing:.16em;color:var(--cn-red)}
.cn-ht{margin:0;font-size:clamp(28px,5vw,52px);font-weight:800;letter-spacing:-.025em;line-height:1.04;overflow-wrap:anywhere;text-shadow:0 2px 18px #0008}
.cn-hm{margin:0;font-size:14px;font-weight:600;color:#d3d3d3}
.cn-hs{margin:0;font-size:15px;line-height:1.45;color:#e5e5e5;white-space:pre-line;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
.cn-hero.full .cn-hs{-webkit-line-clamp:unset;display:block;max-width:62ch}
.cn-hero.full{min-height:clamp(420px,64vh,640px)}
.cn-hbt{display:flex;flex-wrap:wrap;gap:10px;margin-top:6px}
.cn-gs{display:flex;gap:6px;flex-wrap:wrap}
.cn-gs .cn-chip{font-size:12.5px;padding:5px 12px;background:#ffffff24}
.cn-pbar{height:4px;border-radius:2px;background:#ffffff40;overflow:hidden;max-width:360px}
.cn-pbar b{display:block;height:100%;background:var(--cn-red)}
.cn-src{margin:12px 2px 0;font-size:13px;line-height:1.5;color:var(--cn-t2)}
.cn-bn{margin:0 0 12px;padding:10px 14px;border-radius:8px;font-size:13.5px;line-height:1.45;background:#ffffff14}
.cn-bn.er{background:#ff6b6b24;color:#ffb3b3}
.cn-bn.wa{background:#f5a62320;color:#ffd08a}
.cn-bn.ok{background:#46d36924;color:#9cf0b3}
.cn-empty{max-width:560px;margin:18px auto 0;padding:34px 20px;text-align:center;background:#ffffff0d;border:1px dashed #ffffff33;border-radius:14px}
.cn-empty .cn-i{width:48px;height:48px;color:var(--cn-red);margin-bottom:10px}
.cn-empty h2{margin:0 0 8px;font-size:20px}
.cn-empty p{margin:0 0 14px;color:var(--cn-t2);font-size:14px;line-height:1.5}
.cn-sy{margin:26px 2px 0;font-size:12.5px;line-height:1.55;color:var(--cn-t2)}
.cn-lk{background:none;border:0;padding:0;color:#fff;text-decoration:underline;font:inherit;cursor:pointer}
@media(max-width:640px){.cn-hero{min-height:420px}.cn-hp{right:4%;top:5%;height:50%;opacity:.55}.cn-hs{-webkit-line-clamp:3;font-size:14px}.cn-bw,.cn-bg{min-height:40px;padding:0 16px;font-size:14px}}
/* ---- formulário (modal) ---- */
#md .box.cn-form{max-width:560px;width:100%;max-height:94vh;overflow-y:auto;background:#181818;color:#fff;border:1px solid #333;border-radius:14px;padding:18px 16px;-webkit-overflow-scrolling:touch}
#md .box.cn-form h3{margin:0 0 12px;font-size:20px;color:#fff}
#md .box.cn-form label{display:block;margin:0 0 12px;font-size:13px;font-weight:600;color:#d0d0d0}
#md .box.cn-form input:not([type=checkbox]):not([type=file]),#md .box.cn-form textarea{display:block;width:100%;margin-top:5px;background:#2a2a2a;color:#fff;border:1px solid #444;border-radius:6px;padding:0 12px;height:44px;font:inherit;font-size:15px;outline:0}
#md .box.cn-form textarea{height:auto;padding:10px 12px;line-height:1.4;resize:vertical}
#md .box.cn-form input:focus,#md .box.cn-form textarea:focus{border-color:#fff}
#md .box.cn-form small{font-weight:400;color:#9a9a9a}
/* campo de arquivo invisível mas "clicável" (mais confiável em navegadores móveis do que display:none/hidden) */
#md .box.cn-form .cn-vh{position:absolute!important;width:1px!important;height:1px!important;margin:-1px!important;padding:0!important;border:0!important;opacity:0!important;overflow:hidden;clip:rect(0 0 0 0);pointer-events:none}
.cn-any{margin:-4px 0 12px;font-size:12.5px;line-height:1.5;color:#9a9a9a}
.cn-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.cn-drop{display:flex;flex-direction:column;align-items:center;gap:4px;padding:18px 12px;margin:0 0 12px;text-align:center;border:2px dashed #555;border-radius:10px;background:#222;cursor:pointer;color:#fff;transition:border-color .15s,background .15s}
.cn-drop:hover,.cn-drop.dr{border-color:var(--cn-red);background:#2b1517}
.cn-drop .cn-i{width:32px;height:32px;color:var(--cn-red)}
.cn-drop b{font-size:15px;overflow-wrap:anywhere}
.cn-drop.ok{border-color:var(--cn-ok)}
.cn-drop.er{border-color:var(--cn-er)}
.cn-cvrow{display:flex;gap:12px;align-items:center;margin:0 0 12px}
.cn-cvp{width:70px;height:105px;flex:none;border-radius:6px;background:#2a2a2a center/cover no-repeat;display:grid;place-items:center;color:#777;font-size:12px;text-align:center;overflow:hidden}
.cn-cvrow .cn-btn{margin:0 6px 6px 0}
.cn-fm{margin:0 0 12px;padding:10px 12px;border-radius:8px;font-size:13.5px;line-height:1.4}
.cn-fm.er{background:#ff6b6b24;color:#ffb3b3}
.cn-fm.ok{background:#46d36924;color:#9cf0b3}
.cn-fm.wa{background:#f5a62320;color:#ffd08a}
.cn-ck{display:flex!important;align-items:flex-start;gap:10px;font-weight:400!important}
.cn-ck input{margin-top:2px;width:18px;height:18px;accent-color:#E50914}
.cn-gsug{display:flex;flex-wrap:wrap;gap:6px;margin:-4px 0 12px}
.cn-gsug .cn-chip{font-size:12px;padding:5px 11px}
.cn-prw{margin:0 0 12px}
.cn-prb{height:10px;border-radius:5px;background:#333;overflow:hidden}
.cn-prb b{display:block;height:100%;width:0;background:var(--cn-red);transition:width .2s}
.cn-prt{margin-top:6px;font-size:12.5px;color:#d0d0d0;font-variant-numeric:tabular-nums}
.cn-fa{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
.cn-ok{text-align:center;padding:14px 4px}
.cn-ok .cn-i{width:56px;height:56px;color:var(--cn-ok)}
.cn-ok h3{margin:10px 0 6px!important}
.cn-ok p{margin:0 0 14px;color:#cfcfcf;font-size:14px;line-height:1.5}
@media(max-width:480px){#md .box.cn-form{border-radius:14px 14px 0 0;max-height:96vh}.cn-two{grid-template-columns:1fr}}
/* ---- Reprodutor (camada própria, fora de #mn: nenhum render() do ARCO interrompe o filme) ---- */
#cnp{position:fixed;top:0;right:0;bottom:0;left:var(--sw);z-index:20;background:#000;display:none;color:#fff;overscroll-behavior:contain}
#cnp.on{display:block}
@media(max-width:760px){#cnp{left:0}}
html.cn-lock{overflow:hidden}
#cnp .cn-st{position:absolute;inset:0;background:#000;overflow:hidden;touch-action:manipulation;outline:0}
#cnp video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000}
#cnp video::cue{background:#000b;color:#fff;font-size:1.1em;line-height:1.3}
#cnp .cn-tap{position:absolute;inset:0;z-index:1}
#cnp .cn-top,#cnp .cn-bot{position:absolute;left:0;right:0;z-index:7;display:flex;transition:opacity .25s}
#cnp .cn-top{top:0;align-items:center;gap:10px;padding:max(10px,env(safe-area-inset-top)) max(14px,env(safe-area-inset-right)) 34px max(14px,env(safe-area-inset-left));background:linear-gradient(#000c,transparent);pointer-events:none}
#cnp .cn-bot{bottom:0;flex-direction:column;padding:46px max(14px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(14px,env(safe-area-inset-left));background:linear-gradient(transparent,#000d);pointer-events:none}
#cnp .cn-top>*,#cnp .cn-bot>*{pointer-events:auto}
#cnp:not(.cn-show) .cn-top,#cnp:not(.cn-show) .cn-bot{opacity:0}
#cnp:not(.cn-show) .cn-top>*,#cnp:not(.cn-show) .cn-bot>*{pointer-events:none}
#cnp:not(.cn-show) .cn-st{cursor:none}
#cnp .cn-tt{min-width:0;display:flex;flex-direction:column;line-height:1.25}
#cnp .cn-tt b{font-size:16px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#cnp .cn-tt span{font-size:12.5px;color:#b8b8b8}
#cnp .cn-pi{display:inline-flex;align-items:center;justify-content:center;flex:none;width:40px;height:40px;padding:0;border:0;border-radius:50%;background:transparent;color:#fff;cursor:pointer;transition:background .15s}
#cnp .cn-pi:hover{background:#ffffff29}
#cnp .cn-pi:focus-visible,#cnp .cn-mi:focus-visible,#cnp .cn-bt:focus-visible{outline:2px solid #fff;outline-offset:1px}
#cnp .cn-pi svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
#cnp .cn-pi.tx{width:auto;min-width:40px;padding:0 8px;border-radius:20px;font:inherit;font-size:13px;font-weight:600}
#cnp .cn-mid{position:absolute;inset:0;z-index:2;display:grid;place-items:center;pointer-events:none}
#cnp .cn-big{display:none;place-items:center;width:78px;height:78px;border:0;border-radius:50%;background:#e50914d9;color:#fff;cursor:pointer;pointer-events:auto}
#cnp .cn-big svg{width:34px;height:34px;fill:none;stroke:currentColor;stroke-width:2}
#cnp.cn-paused .cn-big{display:grid}
#cnp .cn-spin{display:none;width:46px;height:46px;border-radius:50%;border:3px solid #ffffff40;border-top-color:var(--cn-red);animation:cnsp .8s linear infinite}
#cnp.cn-load .cn-spin{display:block}
#cnp.cn-load .cn-big,#cnp.cn-bad .cn-big,#cnp.cn-bad .cn-spin{display:none}
@keyframes cnsp{to{transform:rotate(360deg)}}
#cnp .cn-slow{position:absolute;left:0;right:0;bottom:104px;z-index:3;text-align:center;font-size:13px;color:#c5c5c5;display:none}
#cnp.cn-load.cn-slw .cn-slow{display:block}
#cnp .cn-rip{position:absolute;top:50%;z-index:3;transform:translateY(-50%);padding:10px 16px;border-radius:24px;background:#000b;font-weight:600;font-size:14px;opacity:0;pointer-events:none;transition:opacity .2s}
#cnp .cn-rip.on{opacity:1}
#cnp .cn-seek{position:relative;display:flex;align-items:center;height:24px}
#cnp .cn-trk{position:absolute;left:0;right:0;height:4px;border-radius:2px;background:#ffffff3d;overflow:hidden;transition:height .12s}
#cnp .cn-seek:hover .cn-trk,#cnp .cn-seek.dr .cn-trk{height:6px}
#cnp .cn-buf,#cnp .cn-prg{position:absolute;left:0;top:0;bottom:0;width:0}
#cnp .cn-buf{background:#ffffff57}
#cnp .cn-prg{background:var(--cn-red)}
#cnp .cn-seek input,#cnp .cn-vol input{-webkit-appearance:none;appearance:none;margin:0;padding:0;border:0;border-radius:0;background:transparent;outline:0;box-shadow:none;cursor:pointer}
#cnp .cn-seek input{position:relative;z-index:1;width:100%;height:24px}
#cnp .cn-seek input::-webkit-slider-runnable-track{height:24px;background:transparent}
#cnp .cn-seek input::-moz-range-track{height:24px;background:transparent}
#cnp .cn-seek input::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;margin-top:5px;border-radius:50%;background:var(--cn-red);transform:scale(0);transition:transform .12s}
#cnp .cn-seek input::-moz-range-thumb{width:14px;height:14px;border:0;border-radius:50%;background:var(--cn-red);transform:scale(0);transition:transform .12s}
#cnp .cn-seek:hover input::-webkit-slider-thumb,#cnp .cn-seek.dr input::-webkit-slider-thumb{transform:scale(1)}
#cnp .cn-seek:hover input::-moz-range-thumb,#cnp .cn-seek.dr input::-moz-range-thumb{transform:scale(1)}
@media(pointer:coarse){#cnp .cn-seek input::-webkit-slider-thumb{transform:scale(1)}#cnp .cn-seek input::-moz-range-thumb{transform:scale(1)}}
#cnp .cn-seek input:disabled{cursor:default}
#cnp .cn-tip{position:absolute;bottom:28px;transform:translateX(-50%);padding:2px 8px;border-radius:6px;background:#000e;font-size:12px;font-variant-numeric:tabular-nums;pointer-events:none;opacity:0;transition:opacity .1s}
#cnp .cn-ctl{display:flex;align-items:center;gap:2px;min-width:0}
#cnp .cn-tm{margin:0 8px;font-size:13px;font-variant-numeric:tabular-nums;white-space:nowrap;color:#e8e8e8}
#cnp .cn-f{flex:1}
#cnp .cn-vol{display:flex;align-items:center}
#cnp .cn-vol input{width:0;height:20px;opacity:0;transition:width .18s,opacity .18s,margin .18s;background:linear-gradient(to right,#fff var(--v,100%),#ffffff4d var(--v,100%)) center/100% 4px no-repeat}
#cnp .cn-vol:hover input,#cnp .cn-vol:focus-within input{width:84px;opacity:1;margin:0 8px 0 2px}
#cnp .cn-vol input::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;border-radius:50%;background:#fff}
#cnp .cn-vol input::-moz-range-thumb{width:12px;height:12px;border:0;border-radius:50%;background:#fff}
@media(hover:none){#cnp .cn-vol input{display:none}}
@media(max-width:520px){#cnp .cn-pi{width:36px;height:36px}#cnp .cn-tm{margin:0 4px;font-size:12px}#cnp .cn-bot{padding-top:36px}}
#cnp .cn-mn{position:absolute;right:max(14px,env(safe-area-inset-right));bottom:calc(76px + env(safe-area-inset-bottom));z-index:9;min-width:190px;max-width:calc(100% - 28px);max-height:min(62%,380px);overflow:auto;padding:6px;background:#141414f7;border:1px solid #333;border-radius:12px;box-shadow:0 12px 32px #0008}
#cnp .cn-mn[hidden]{display:none}
#cnp .cn-mn h4{margin:0;padding:8px 10px 4px;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#9a9a9a}
#cnp .cn-mn p{margin:0;padding:6px 10px;max-width:270px;font-size:12.5px;line-height:1.4;color:#9a9a9a}
#cnp .cn-mn p.er{color:#f08a84}
#cnp .cn-mi{display:flex;align-items:center;gap:8px;width:100%;padding:9px 10px;border:0;border-radius:8px;background:transparent;color:#e8e8e8;font:inherit;font-size:14px;text-align:left;cursor:pointer}
#cnp .cn-mi:hover{background:#ffffff17}
#cnp .cn-mi i{width:16px;flex:none;font-style:normal;color:var(--cn-red)}
#cnp .cn-err{position:absolute;inset:0;z-index:6;display:none;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:70px 24px 24px;text-align:center;background:#050505f0}
#cnp.cn-bad .cn-err{display:flex}
#cnp.cn-bad .cn-bot,#cnp.cn-bad .cn-mid,#cnp.cn-bad .cn-tap{display:none}
#cnp .cn-err h3{margin:0;font-size:19px}
#cnp .cn-err p{margin:0;max-width:500px;font-size:14px;line-height:1.5;color:#c5c5c5}
#cnp .cn-bt{display:inline-flex;align-items:center;justify-content:center;gap:7px;height:38px;padding:0 16px;border-radius:6px;border:1px solid #444;background:transparent;color:#fff;font:inherit;font-size:14px;font-weight:600;cursor:pointer}
#cnp .cn-bt.p{background:var(--cn-red);border-color:transparent}
#cnp .cn-bt svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
#cnp .cn-bts{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:4px}
@media(prefers-reduced-motion:reduce){#cnp .cn-spin{animation-duration:2.5s}.cn-cv,.cn-prb b{transition:none}}
`;
    document.head.appendChild(css);
  }

  /* ================= ícones ================= */
  const SVG = d => `<svg class="cn-i" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${d}</svg>`;
  const IC = {
    play: SVG('<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>'),
    plus: SVG('<path d="M12 5v14M5 12h14"/>'),
    edit: SVG('<path d="M4 20h4L19 9l-4-4L4 16v4z"/>'),
    trash: SVG('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
    left: SVG('<path d="M15 5l-7 7 7 7"/>'),
    right: SVG('<path d="M9 5l7 7-7 7"/>'),
    search: SVG('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'),
    info: SVG('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
    dl: SVG('<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>'),
    film: SVG('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>'),
    check: SVG('<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>'),
    up: SVG('<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>')
  };

  /* ================= estado, dados e utilidades ================= */
  const st = { q: '', g: '', v: 'home', id: null, sy: 0 };
  const idOk = id => typeof id === 'string' && /^[\w-]{1,24}$/.test(id);
  const cn = () => {
    if (!S.cine || typeof S.cine !== 'object' || Array.isArray(S.cine)) S.cine = {};
    const c = S.cine;
    if (!Array.isArray(c.movies)) c.movies = [];
    if (!c.prog || typeof c.prog !== 'object' || Array.isArray(c.prog)) c.prog = {};
    if (!c.seen || typeof c.seen !== 'object' || Array.isArray(c.seen)) c.seen = {};
    return c;
  };
  const list = () => cn().movies.filter(m => m && typeof m === 'object' && idOk(m.id) && !m.del);
  const mv = id => list().find(m => m.id === id) || null;
  const prog = id => { const p = cn().prog[id]; return p && typeof p === 'object' ? p : null; };
  const canResume = m => { const p = prog(m.id); return !!(p && !p.done && p.t > 10 && p.d > 0 && p.t < p.d - 15); };
  const persist = () => { try { sv(); } catch (e) {} };
  const initData = () => {
    const c = cn(), lim = Date.now() - 180 * 864e5;
    c.movies = c.movies.filter(m => m && typeof m === 'object' && idOk(m.id) && !(m.del && (m.u || 0) < lim));
    c.movies.forEach(m => { m.u = m.u || m.upd || m.added || 0; });
  };
  const gen = m => (Array.isArray(m.genres) ? m.genres : []).map(x => String(x)).filter(Boolean);
  const fmtDur = min => {
    min = Math.round(+min || 0);
    if (min <= 0) return '';
    const h = Math.floor(min / 60), m = min % 60;
    return h ? (m ? h + 'h ' + String(m).padStart(2, '0') + 'min' : h + 'h') : m + 'min';
  };
  const parseDur = s => {
    s = String(s || '').trim().toLowerCase();
    if (!s) return 0;
    let m;
    if ((m = s.match(/^(\d+)\s*h(?:\s*(\d{1,2})\s*(?:m|min|mins)?)?$/))) return +m[1] * 60 + (+m[2] || 0);
    if ((m = s.match(/^(\d+):(\d{2}):(\d{2})$/))) return Math.round(+m[1] * 60 + +m[2] + +m[3] / 60);
    if ((m = s.match(/^(\d+):(\d{2})$/))) return +m[1] * 60 + +m[2];
    if ((m = s.match(/^(\d+)\s*(?:m|min|mins|minutos?)?$/))) return +m[1];
    return NaN;
  };
  const clock = sec => {
    sec = Math.max(0, Math.floor(sec || 0));
    const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
  };
  const fmtSize = b => {
    b = +b || 0;
    return b >= 1073741824 ? (b / 1073741824).toFixed(2).replace('.', ',') + ' GB' : (b / 1048576).toFixed(b >= 10485760 ? 0 : 1).replace('.', ',') + ' MB';
  };
  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const safeUrl = u => { try { const x = new URL(String(u || '').trim(), location.href); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch (e) { return ''; } };
  const hue = t => { let h = 0; for (const c of String(t || '')) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
  const ini = t => { const w = String(t || '?').trim().split(/\s+/).filter(Boolean); return ((w[0] || '?')[0] + (w.length > 1 ? w[1][0] : '')).toUpperCase(); };
  const host = u => { try { return new URL(u, location.href).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const rid = () => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  const getPref = () => { try { return JSON.parse(localStorage.getItem('hub_cine_pref')) || {}; } catch (e) { return {}; } };
  const setPref = o => { try { localStorage.setItem('hub_cine_pref', JSON.stringify(Object.assign(getPref(), o))); } catch (e) {} };
  const metaLine = m => [m.year || '', fmtDur(m.dur)].filter(Boolean).join(' · ');
  const byTitle = (a, b) => norm(a.title).localeCompare(norm(b.title), 'pt-BR');
  const GENRES = ['Ação', 'Aventura', 'Animação', 'Comédia', 'Crime', 'Documentário', 'Drama', 'Fantasia', 'Ficção científica', 'Guerra', 'Musical', 'Romance', 'Suspense', 'Terror', 'Família'];
  const MIME = { mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg', ogg: 'video/ogg', mov: 'video/quicktime', mkv: 'video/x-matroska', '3gp': 'video/3gpp', avi: 'video/x-msvideo', mpg: 'video/mpeg', mpeg: 'video/mpeg', ts: 'video/mp2t', wmv: 'video/x-ms-wmv', flv: 'video/x-flv' };
  const extOf = n => (String(n || '').match(/\.([a-z0-9]{2,5})$/i) || [])[1] ? String(n).match(/\.([a-z0-9]{2,5})$/i)[1].toLowerCase() : '';
  const guessType = n => MIME[extOf(n)] || 'video/mp4';
  const isVideo = f => /^video\//.test(f.type || '') || !!MIME[extOf(f.name)];
  const nameToTitle = n => String(n || '').replace(/\.[^.]+$/, '').replace(/[._]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140);

  /* Accept do seletor de VÍDEO (nunca image/*). A capa usa um seletor próprio, separado. */
  const VIDEO_ACCEPT = 'video/*,.mp4,.webm,.m4v,.ogv,.mov,.mkv,.3gp';

  /* Valida o conteúdo real do arquivo pelos primeiros bytes (assinatura), sem confiar só em nome/tipo.
     Devolve 'video', 'image', 'other' (ex.: HTML/PDF/texto) ou '' (não reconhecido). */
  const sniff = async f => {
    let b;
    try { b = new Uint8Array(await f.slice(0, 200).arrayBuffer()); } catch (e) { return ''; }
    if (b.length < 4) return '';
    const s = (o, t) => b.length >= o + t.length && t.split('').every((c, i) => b[o + i] === c.charCodeAt(0));
    const h = (...a) => a.every((x, i) => b[i] === x);
    if (h(0xFF, 0xD8, 0xFF) || h(0x89, 0x50, 0x4E, 0x47) || s(0, 'GIF8') || s(0, 'BM') || (s(0, 'RIFF') && s(8, 'WEBP')) || h(0x49, 0x49, 0x2A, 0x00) || h(0x4D, 0x4D, 0x00, 0x2A)) return 'image';
    if (s(4, 'ftyp')) { const br = String.fromCharCode(b[8], b[9], b[10], b[11]); return /^(heic|heix|heim|heis|mif1|msf1|avif)/.test(br) ? 'image' : 'video'; }
    if (h(0x1A, 0x45, 0xDF, 0xA3) || s(0, 'OggS') || (s(0, 'RIFF') && s(8, 'AVI ')) || h(0x30, 0x26, 0xB2, 0x75) || s(0, 'FLV') || h(0x00, 0x00, 0x01, 0xBA) || h(0x00, 0x00, 0x01, 0xB3)) return 'video';
    if (b[0] === 0x47 && b[188] === 0x47) return 'video';
    if (s(0, '%PDF') || s(0, 'PK') || s(0, '<!') || s(0, '<ht') || s(0, '<?x') || s(0, '{') || s(0, 'ID3')) return 'other';
    return '';
  };

  /* mensagens compreensíveis para falhas de armazenamento/arquivo */
  const CANCEL = Object.assign(new Error('cancel'), { name: 'Cancel' });
  const errMsg = e => {
    const n = e && e.name, m = String((e && e.message) || e || '');
    if (e === CANCEL) return 'Importação cancelada. Nada foi salvo.';
    if (n === 'QuotaExceededError' || /quota/i.test(m)) return 'Sem espaço de armazenamento neste aparelho. Libere espaço (exclua filmes aqui ou arquivos do aparelho) e tente de novo.';
    if (m === 'noidb' || n === 'SecurityError') return 'Este navegador não permite armazenamento local (IndexedDB indisponível). Em janela anônima/privada isso costuma ser bloqueado.';
    if (m === 'blocked') return 'O armazenamento está bloqueado por outra aba do ARCO aberta numa versão antiga. Feche as outras abas e recarregue.';
    if (n === 'NotReadableError' || n === 'NotFoundError' && !/object store/i.test(m)) return 'Não foi possível ler o arquivo selecionado. Ele pode ter sido movido, apagado ou estar na nuvem sem ser baixado.';
    if (m === 'corrupt') return 'O arquivo guardado está incompleto ou corrompido. Exclua o filme e importe o vídeo de novo.';
    return 'Falha no armazenamento local' + (m ? ' (' + m + ')' : '') + '.';
  };
  const probeMsg = e => {
    const m = String((e && e.message) || '');
    if (m === 'timeout') return 'O navegador demorou demais para ler o arquivo (20 s). Ele pode estar corrompido ou ser muito pesado para este aparelho.';
    return 'Este navegador não consegue reproduzir esse arquivo (formato ou codec incompatível). Converta para MP4 (H.264/AAC) ou WebM e tente de novo.';
  };

  /* ================= IndexedDB: arquivos de vídeo em pedaços ================= */
  const CH = 8 * 1048576;
  let dbP = null;
  const idb = () => dbP || (dbP = new Promise((ok, no) => {
    if (!window.indexedDB) { no(new Error('noidb')); return; }
    let r;
    try { r = indexedDB.open('arco-cinema', 1); } catch (e) { no(e); return; }
    r.onupgradeneeded = () => {
      const d = r.result;
      d.createObjectStore('chunks', { keyPath: ['fid', 'i'] });
      d.createObjectStore('assets', { keyPath: 'k' });
      d.createObjectStore('files', { keyPath: 'mid' });
    };
    r.onsuccess = () => { const d = r.result; d.onversionchange = () => { d.close(); dbP = null; }; ok(d); };
    r.onerror = () => no(r.error);
    r.onblocked = () => no(new Error('blocked'));
  }).catch(e => { dbP = null; throw e; }));
  const run = (stores, mode, fn) => idb().then(d => new Promise((ok, no) => {
    let t, out;
    try { t = d.transaction(stores, mode); } catch (e) { no(e); return; }
    t.oncomplete = () => ok(out && typeof out === 'object' && 'result' in out ? out.result : out);
    t.onerror = () => no(t.error);
    t.onabort = () => no(t.error || new Error('abort'));
    try { out = fn(t); } catch (e) { try { t.abort(); } catch (x) {} no(e); }
  }));
  const rng = fid => IDBKeyRange.bound([fid, 0], [fid, Infinity]);
  const dropChunks = fid => run('chunks', 'readwrite', t => { t.objectStore('chunks').delete(rng(fid)); });
  const Store = {
    list: () => run('files', 'readonly', t => t.objectStore('files').getAll()).then(r => r || []),
    manifest: mid => run('files', 'readonly', t => t.objectStore('files').get(mid)),
    /* grava o vídeo em pedaços; só ao final grava o registro "completo". Se falhar/cancelar, apaga o que gravou. */
    async put(mid, file, prog, ctl) {
      const fid = rid(), n = Math.max(1, Math.ceil(file.size / CH));
      const old = await Store.manifest(mid).catch(() => null);
      try {
        for (let i = 0; i < n; i++) {
          if (ctl && ctl.cancel) throw CANCEL;
          const end = Math.min(file.size, (i + 1) * CH);
          await run('chunks', 'readwrite', t => { t.objectStore('chunks').put({ fid, i, blob: file.slice(i * CH, end) }); });
          if (prog) prog(file.size ? end / file.size : 1, end);
        }
        if (ctl && ctl.cancel) throw CANCEL;
        await run('files', 'readwrite', t => { t.objectStore('files').put({ mid, fid, name: file.name, type: file.type || guessType(file.name), size: file.size, n, added: Date.now() }); });
      } catch (e) { await dropChunks(fid).catch(() => {}); throw e; }
      if (old && old.fid && old.fid !== fid) dropChunks(old.fid).catch(() => {});
    },
    async blob(mid) {
      const m = await Store.manifest(mid);
      if (!m) return null;
      const rows = await run('chunks', 'readonly', t => t.objectStore('chunks').getAll(rng(m.fid)));
      rows.sort((a, b) => a.i - b.i);
      let s = 0; rows.forEach(r => { s += r.blob.size; });
      if (rows.length !== m.n || s !== m.size) throw new Error('corrupt');
      return new Blob(rows.map(r => r.blob), { type: m.type });
    },
    /* apaga vídeo + capa + legendas do filme; devolve os bytes liberados */
    async drop(mid) {
      const m = await Store.manifest(mid).catch(() => null);
      await run(['chunks', 'files', 'assets'], 'readwrite', t => {
        if (m && m.fid) t.objectStore('chunks').delete(rng(m.fid));
        t.objectStore('files').delete(mid);
        t.objectStore('assets').delete('cover:' + mid);
        t.objectStore('assets').delete('subs:' + mid);
      });
      return m ? m.size : 0;
    },
    assetPut: (k, val) => run('assets', 'readwrite', t => { t.objectStore('assets').put(Object.assign({ k }, val)); }),
    assetGet: k => run('assets', 'readonly', t => t.objectStore('assets').get(k)),
    assetDel: k => run('assets', 'readwrite', t => { t.objectStore('assets').delete(k); }),
    /* limpa pedaços de importações que não chegaram ao fim (ex.: aba fechada). Só os com mais de 10 min. */
    async gc() {
      const [keys, files] = await Promise.all([run('chunks', 'readonly', t => t.objectStore('chunks').getAllKeys()), Store.list()]);
      const live = new Set(files.map(f => f.fid)), dead = new Set(), lim = Date.now() - 6e5;
      keys.forEach(k => { const f = k[0]; if (!live.has(f) && (parseInt(String(f).split('-')[0], 36) || 0) < lim) dead.add(f); });
      for (const f of dead) await dropChunks(f);
    }
  };
  let HAS = new Set(), FSZ = new Map(), FILES = [], hasState = 'load', hasErr = '';
  const hasLocal = id => HAS.has(id);
  const playable = m => hasLocal(m.id) || !!m.url || (hasState !== 'ready' && !!m.fileName);
  const IMP = { active: false, ctl: null };
  const say = t => {
    try { if (typeof toast === 'function') { toast(t); return; } } catch (e) {}
    const e = document.getElementById('cn-live');
    if (e) { e.textContent = t; e.hidden = false; clearTimeout(say.t); say.t = setTimeout(() => { e.hidden = true; }, 5000); }
  };

  /* ---- capas (blob URLs com cache; revogadas ao trocar/excluir) ---- */
  const COVP = new Map();
  const getCov = id => {
    let p = COVP.get(id);
    if (!p) { p = Store.assetGet('cover:' + id).then(a => a && a.blob ? URL.createObjectURL(a.blob) : '').catch(() => ''); COVP.set(id, p); }
    return p;
  };
  const dropCov = id => { const p = COVP.get(id); COVP.delete(id); if (p) p.then(u => { if (u) URL.revokeObjectURL(u); }); };
  const hydrate = () => {
    document.querySelectorAll('[data-cvid]').forEach(el => {
      if (el.dataset.cvd) return;
      el.dataset.cvd = '1';
      getCov(el.dataset.cvid).then(u => {
        if (!u || !el.isConnected) return;
        if (el.tagName === 'IMG') { el.src = u; el.hidden = false; } else el.style.setProperty('--cv', 'url("' + u + '")');
      });
    });
    updStor();
  };
  const hyd = () => setTimeout(hydrate, 0);

  async function loadHas() {
    try {
      FILES = await Store.list();
      HAS = new Set(FILES.map(f => f.mid));
      FSZ = new Map(FILES.map(f => [f.mid, f.size]));
      hasState = 'ready'; hasErr = '';
      Store.gc().catch(() => {});
    } catch (e) { hasState = 'err'; hasErr = errMsg(e); }
    refreshUI();
  }
  async function updStor() {
    const e = document.getElementById('cn-stor');
    if (!e || hasState !== 'ready') return;
    let used = 0; FSZ.forEach(s => { used += s; });
    let free = '';
    try {
      const est = navigator.storage && navigator.storage.estimate && await navigator.storage.estimate();
      if (est && est.quota) free = ' · espaço livre aproximado: ' + fmtSize(Math.max(0, est.quota - (est.usage || 0)));
    } catch (x) {}
    const live = new Set(list().map(m => m.id));
    let orph = 0, osz = 0; FSZ.forEach((s, id) => { if (!live.has(id)) { orph++; osz += s; } });
    const e2 = document.getElementById('cn-stor');
    if (!e2) return;
    e2.innerHTML = 'Armazenamento local: ' + HAS.size + (HAS.size === 1 ? ' arquivo, ' : ' arquivos, ') + fmtSize(used) + free
      + (orph ? ` · <button type="button" class="cn-lk" onclick="CN.clean()">Limpar ${orph} arquivo(s) sem filme (${fmtSize(osz)})</button>` : '');
  }
  const purgeLocal = id => {
    if (!HAS.has(id)) return;
    Store.drop(id).then(() => { HAS.delete(id); FSZ.delete(id); dropCov(id); }).catch(() => {});
  };

  /* ---- verificação de arquivo, quadro de capa e redimensionamento ---- */
  async function probe(file, wantPoster) {
    const v = document.createElement('video'), u = URL.createObjectURL(file);
    v.preload = 'auto'; v.muted = true; v.playsInline = true;
    const waitEv = (ev, ms) => new Promise((res, rej) => {
      const to = setTimeout(() => rej(new Error('timeout')), ms);
      v.addEventListener(ev, () => { clearTimeout(to); res(); }, { once: true });
      v.addEventListener('error', () => { clearTimeout(to); rej(new Error('media')); }, { once: true });
    });
    try {
      const p = waitEv('loadedmetadata', 20000);
      v.src = u; await p;
      const o = { dur: isFinite(v.duration) ? v.duration : 0, w: v.videoWidth, h: v.videoHeight, poster: null };
      if (wantPoster && o.w && o.dur > 0) {
        try {
          const s = waitEv('seeked', 8000);
          v.currentTime = Math.min(o.dur * 0.1, 60); await s;
          const c = document.createElement('canvas'), sc = Math.min(1, 640 / o.w);
          c.width = Math.round(o.w * sc); c.height = Math.round(o.h * sc);
          c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
          o.poster = await new Promise(r => c.toBlob(b => r(b), 'image/jpeg', 0.8));
        } catch (e) {}
      }
      return o;
    } finally { try { v.removeAttribute('src'); v.load(); } catch (e) {} URL.revokeObjectURL(u); }
  }
  function resizeImage(file, mw, mh) {
    return new Promise((ok, no) => {
      const u = URL.createObjectURL(file), im = new Image();
      im.onload = () => {
        try {
          const s = Math.min(1, mw / im.width, mh / im.height), w = Math.max(1, Math.round(im.width * s)), h = Math.max(1, Math.round(im.height * s));
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          c.getContext('2d').drawImage(im, 0, 0, w, h);
          URL.revokeObjectURL(u);
          c.toBlob(b => b ? ok(b) : no(new Error('img')), 'image/jpeg', 0.85);
        } catch (e) { URL.revokeObjectURL(u); no(e); }
      };
      im.onerror = () => { URL.revokeObjectURL(u); no(new Error('img')); };
      im.src = u;
    });
  }
  const decodeText = async f => {
    const b = await f.arrayBuffer();
    try { return new TextDecoder('utf-8', { fatal: true }).decode(b); } catch (e) { return new TextDecoder('windows-1252').decode(b); }
  };
  const toVtt = txt => {
    txt = String(txt).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    if (/^WEBVTT/.test(txt.trim())) return txt;
    if (!/-->/.test(txt)) throw new Error('formato');
    return 'WEBVTT\n\n' + txt.replace(/(\d{1,2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2').replace(/(^|\n)(\d{2}:\d{2}),(\d{3})/g, '$1$2.$3');
  };

  /* ================= compatibilidade com cadastros antigos (link externo) ================= */
  const isDriveHost = h => /(^|\.)(drive\.google\.com|docs\.google\.com|drive\.usercontent\.google\.com)$/i.test(h || '');
  const classify = raw => {
    raw = String(raw || '').trim();
    if (!raw) return { k: 'invalid', why: 'Este filme não tem arquivo nem link de vídeo.' };
    let u;
    try { u = new URL(raw, location.href); } catch (e) { return { k: 'invalid', why: 'O link do vídeo não é uma URL válida.' }; }
    if (!/^https?:$/.test(u.protocol)) return { k: 'invalid', why: 'Só links http:// ou https:// são aceitos.' };
    /* Link de compartilhamento do Google Drive = página HTML, não arquivo de vídeo. Não há integração real com o Drive. */
    if (isDriveHost(u.hostname)) return { k: 'invalid', why: 'Este é um link do Google Drive. Ele abre uma página, não é um arquivo de vídeo reproduzível, e o ARCO não tem integração com o Drive. Baixe o vídeo para este aparelho e importe o arquivo (Editar → Procurar em todos os arquivos).' };
    const ext = (u.pathname.toLowerCase().match(/\.([a-z0-9]{2,5})$/) || [])[1] || '';
    if (/^(html?|php|aspx?|jsp)$/.test(ext)) return { k: 'invalid', why: 'O link aponta para uma página, não para um arquivo de vídeo. Importe o arquivo do vídeo neste aparelho.' };
    return { k: ext === 'm3u8' ? 'hls' : 'file', u: u.href, mixed: location.protocol === 'https:' && u.protocol === 'http:' };
  };
  let hlsP = null;
  const loadHls = () => window.Hls ? Promise.resolve() : hlsP || (hlsP = new Promise((ok, no) => {
    const s = document.createElement('script');
    s.src = 'hls.min.js'; s.onload = ok;
    s.onerror = () => { hlsP = null; no(new Error('hls')); };
    document.head.appendChild(s);
  }));
  const isApple = () => /iP(hone|ad|od)|Macintosh/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/Chrome|Chromium|Edg|Android|Firefox/.test(navigator.userAgent);
  const attach = (video, c, o) => {
    const h = { hls: null, dead: false, destroy() { this.dead = true; if (this.hls) { try { this.hls.destroy(); } catch (e) {} this.hls = null; } } };
    if (c.k !== 'hls') { video.src = c.u; return h; }
    const nat = !!video.canPlayType('application/vnd.apple.mpegurl');
    if (nat && isApple()) { video.src = c.u; return h; }
    loadHls().then(() => {
      if (h.dead) return;
      if (!window.Hls || !Hls.isSupported()) { if (nat) { video.src = c.u; return; } return o.fatal('nosupport'); }
      let net = 0, med = 0;
      const hls = h.hls = new Hls({ enableWorker: true, startPosition: o.start > 0 ? o.start : -1 });
      hls.on(Hls.Events.MANIFEST_PARSED, () => { o.levels && o.levels(hls.levels.map((l, i) => ({ i, h: l.height || 0, br: l.bitrate || 0 }))); });
      hls.on(Hls.Events.LEVEL_SWITCHED, (e, d) => o.level && o.level(d.level));
      hls.on(Hls.Events.ERROR, (e, d) => {
        if (!d || !d.fatal || h.dead) return;
        if (d.type === Hls.ErrorTypes.NETWORK_ERROR && net++ < 2) { hls.startLoad(); return; }
        if (d.type === Hls.ErrorTypes.MEDIA_ERROR && med++ < 2) { hls.recoverMediaError(); return; }
        o.fatal(d.type === Hls.ErrorTypes.NETWORK_ERROR ? 'net' : d.type === Hls.ErrorTypes.MEDIA_ERROR ? 'media' : 'other');
      });
      hls.loadSource(c.u); hls.attachMedia(video);
    }).catch(() => { if (!h.dead) o.fatal('script'); });
    return h;
  };
  const MIXED = 'O ARCO está em HTTPS e este vídeo usa http://. O navegador bloqueia esse conteúdo misto. Use um link https:// ou, melhor, importe o arquivo neste aparelho.';
  const msgUrl = (code, c) => {
    if (c && c.mixed) return { title: 'Conteúdo bloqueado pelo navegador', msg: MIXED, retry: false };
    if (code === 1) return { title: 'Carregamento interrompido', msg: 'O carregamento do vídeo foi cancelado. Tente novamente.' };
    if (code === 2) return { title: 'Falha de rede', msg: 'A conexão caiu ao baixar o vídeo. Verifique sua internet e tente novamente.' };
    if (code === 3) return { title: 'Não foi possível decodificar o vídeo', msg: 'O arquivo pode estar corrompido ou usar um codec que este aparelho não suporta.', retry: false };
    return { title: 'Não foi possível reproduzir', msg: 'O link não respondeu como um vídeo (formato não suportado, link expirado ou servidor sem permissão). Importe o arquivo do vídeo neste aparelho para não depender do link.', retry: false };
  };
  const msgHls = k => k === 'nosupport' ? { title: 'HLS não suportado', msg: 'Este navegador não reproduz streams HLS (.m3u8).', retry: false }
    : k === 'script' ? { title: 'Componente HLS indisponível', msg: 'Não foi possível carregar hls.min.js. Verifique se o arquivo está publicado junto com o site.' }
    : k === 'net' ? { title: 'Falha ao carregar o stream', msg: 'Não foi possível baixar a playlist ou os trechos do vídeo (rede, CORS ou link expirado).' }
    : { title: 'Erro no stream HLS', msg: 'Ocorreu um erro ao reproduzir este stream.' };
  const fetchText = async u => {
    const r = await fetch(u, { credentials: 'omit' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const b = await r.arrayBuffer();
    try { return new TextDecoder('utf-8', { fatal: true }).decode(b); } catch (e) { return new TextDecoder('windows-1252').decode(b); }
  };

  /* ================= catálogo (telas) ================= */
  const cover = (m, extra) => {
    const u = safeUrl(m.cover), loc = !u && m.hasCover;
    return `<span class="cn-cv" style="--h:${hue(m.title)}"><span class="cn-ph">${esc(ini(m.title))}</span>${u ? `<img src="${esc(u)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="CN.ie(this)">` : loc ? `<img alt="" hidden data-cvid="${m.id}" decoding="async" onerror="CN.ie(this)">` : ''}${extra || ''}</span>`;
  };
  const card = m => {
    const p = prog(m.id), pct = p && p.d ? Math.min(100, Math.round(p.t / p.d * 100)) : 0;
    const pg = canResume(m) && pct > 1 ? `<i class="cn-pg"><b style="width:${pct}%"></b></i>` : '';
    const sb = m.feat ? '<span class="cn-sb" aria-hidden="true">★</span>' : '';
    const tag = !playable(m) ? '<span class="cn-tag">Sem arquivo</span>' : '';
    const meta = metaLine(m);
    return `<button type="button" class="cn-card" onclick="CN.open('${m.id}')" aria-label="${esc(m.title)}${meta ? ', ' + esc(meta) : ''}${tag ? ', sem arquivo neste aparelho' : ''}">${cover(m, pg + sb + tag)}<span class="cn-ct">${esc(m.title)}</span><span class="cn-mt">${esc(meta)}</span></button>`;
  };
  const hero = (m, full) => {
    const u = safeUrl(m.cover), loc = !u && m.hasCover, p = prog(m.id), res = canResume(m);
    const kick = full ? 'ARCO CINEMA' : (m.feat ? 'ARCO CINEMA · EM DESTAQUE' : 'ARCO CINEMA · NOVIDADE');
    const meta = [m.year || '', fmtDur(m.dur), full ? '' : gen(m).slice(0, 3).join(' · ')].filter(Boolean).join(' · ');
    const main = playable(m)
      ? `<button type="button" class="cn-bw" onclick="CN.play('${m.id}')">${IC.play}${res ? 'Continuar de ' + clock(p.t) : 'Assistir'}</button>`
      : `<button type="button" class="cn-bw" onclick="CN.edit('${m.id}',1)">${IC.up}Anexar arquivo</button>`;
    const btns = main + (full
      ? (res && playable(m) ? `<button type="button" class="cn-bg" onclick="CN.play('${m.id}',1)">Do início</button>` : '')
        + `<button type="button" class="cn-bg" onclick="CN.feat('${m.id}')" aria-pressed="${m.feat ? 'true' : 'false'}">${m.feat ? '★ Em destaque' : '☆ Destacar'}</button><button type="button" class="cn-bg" onclick="CN.edit('${m.id}')">${IC.edit}Editar</button>`
        + (hasLocal(m.id) ? `<button type="button" class="cn-bg" onclick="CN.save('${m.id}')">${IC.dl}Baixar arquivo</button>` : '')
        + `<button type="button" class="cn-bg er" onclick="CN.del('${m.id}')">${IC.trash}Excluir</button>`
      : `<button type="button" class="cn-bg" onclick="CN.open('${m.id}')">${IC.info}Mais informações</button>`);
    const pct = p && p.d && !p.done ? Math.min(100, Math.round(p.t / p.d * 100)) : 0;
    const bgv = u ? `--cv:url('${esc(u)}');` : '';
    return `<section class="cn-hero${full ? ' full' : ''}" style="--h:${hue(m.title)};${bgv}"><div class="cn-hb"${loc ? ` data-cvid="${m.id}"` : ''}></div>${u ? `<img class="cn-hp" src="${esc(u)}" alt="" referrerpolicy="no-referrer" onerror="CN.ie(this)">` : loc ? `<img class="cn-hp" alt="" hidden data-cvid="${m.id}" onerror="CN.ie(this)">` : ''}<div class="cn-hx"><span class="cn-hk">${kick}</span><h2 class="cn-ht">${esc(m.title)}</h2>${meta ? `<p class="cn-hm">${esc(meta)}</p>` : ''}${full && gen(m).length ? `<div class="cn-gs">${gen(m).map(g => `<button type="button" class="cn-chip" data-cngo="${esc(g)}">${esc(g)}</button>`).join('')}</div>` : ''}<p class="cn-hs">${m.synopsis ? esc(m.synopsis) : (full ? 'Sem descrição.' : '')}</p>${full && res ? `<div class="cn-pbar" role="img" aria-label="Progresso ${pct}%"><b style="width:${pct}%"></b></div><p class="cn-hm" style="font-weight:500">Parou em ${clock(p.t)} de ${clock(p.d)}</p>` : ''}${full && p && p.done ? '<p class="cn-hm">✓ Assistido</p>' : ''}<div class="cn-hbt">${btns}</div></div></section>`;
  };
  const sec = (title, items, cls) => !items.length ? '' : `<section class="cn-sec"><h2>${title}</h2>${cls === 'cn-grid' ? `<div class="cn-grid" style="margin-top:12px">${items.join('')}</div>` : `<div class="cn-rw"><button type="button" class="cn-ar l" onclick="CN.sc(this,-1)" aria-label="Voltar fileira">${IC.left}</button><div class="cn-row">${items.join('')}</div><button type="button" class="cn-ar r" onclick="CN.sc(this,1)" aria-label="Avançar fileira">${IC.right}</button></div>`}</section>`;
  const allGenres = () => {
    const seen = new Map();
    list().forEach(m => gen(m).forEach(g => { const k = norm(g); if (!seen.has(k)) seen.set(k, g); }));
    return [...seen.values()].sort((a, b) => norm(a).localeCompare(norm(b), 'pt-BR'));
  };
  const chipsHtml = () => ['', ...allGenres()].map(g => `<button type="button" class="cn-chip${(st.g || '') === g ? ' on' : ''}" data-cng="${esc(g)}">${g ? esc(g) : 'Todos'}</button>`).join('');
  const results = () => {
    const all = list(), q = norm(st.q.trim()), g = norm(st.g);
    if (q || g) {
      const r = all.filter(m => (!q || norm(m.title).includes(q)) && (!g || gen(m).some(x => norm(x) === g))).sort(byTitle);
      const lbl = `${r.length} ${r.length === 1 ? 'filme' : 'filmes'}${st.g ? ' em ' + esc(st.g) : ''}${q ? ' para “' + esc(st.q.trim()) + '”' : ''}`;
      return `<p class="cn-count" role="status">${lbl}</p>` + (r.length ? `<div class="cn-grid">${r.map(card).join('')}</div>` : '<div class="cn-bn">Nenhum filme encontrado. Tente outro título ou categoria.</div>');
    }
    const flagged = all.filter(m => m.feat).sort((x, y) => (y.added || 0) - (x.added || 0));
    const recent = [...all].sort((x, y) => (y.added || 0) - (x.added || 0));
    const cont = all.filter(canResume).sort((x, y) => prog(y.id).u - prog(x.id).u);
    const sn = cn().seen, seen = all.filter(x => sn[x.id]).sort((x, y) => sn[y.id] - sn[x.id]);
    return hero(flagged[0] || recent[0])
      + sec('Continuar assistindo', cont.map(card))
      + sec('Em destaque', flagged.map(card))
      + sec('Adicionados recentemente', recent.slice(0, 12).map(card))
      + sec('Assistidos recentemente', seen.slice(0, 12).map(card))
      + sec('Todos os filmes', [...all].sort(byTitle).map(card), 'cn-grid');
  };
  const stateBanner = () => hasState === 'load' ? '<div class="cn-bn" role="status">Carregando sua biblioteca local…</div>'
    : hasState === 'err' ? `<div class="cn-bn er" role="alert"><b>Armazenamento local indisponível.</b> ${esc(hasErr)} Filmes com link antigo continuam funcionando, mas não é possível importar ou tocar arquivos locais.</div>` : '';
  const emptyView = () => `<div class="cn-empty">${IC.film}<h2>Sua biblioteca está vazia</h2><p>Adicione filmes escolhendo os arquivos de vídeo do seu computador ou celular. Eles ficam guardados neste aparelho, tocam sem internet e não dependem de links. O progresso é salvo automaticamente.</p><button type="button" class="cn-btn" onclick="CN.add()">${IC.plus}Adicionar o primeiro filme</button><p style="margin:14px 0 0;font-size:12.5px">Use apenas filmes próprios, de domínio público ou que você tenha autorização para reproduzir.</p></div>`;
  const head = () => `<div class="cn-hd"><h1><b>ARCO</b> Cinema</h1><button type="button" class="cn-btn" onclick="CN.add()">${IC.plus}Adicionar filme</button></div><div id="cn-live" class="cn-bn" role="status" hidden></div>`;
  const catalog = () => {
    if (!list().length) return `<div class="cn-root">${head()}${stateBanner()}${emptyView()}<p class="cn-sy" id="cn-stor"></p><p class="cn-sy" id="cn-sy">${syLine()}</p></div>`;
    if (st.sy) { const y = st.sy; st.sy = 0; setTimeout(() => window.scrollTo(0, y), 0); }
    return `<div class="cn-root">${head()}${stateBanner()}<div class="cn-bar"><label class="cn-search">${IC.search}<input id="cn-q" type="search" placeholder="Buscar filme pelo título" value="${esc(st.q)}" oninput="CN.q(this.value)" autocomplete="off" enterkeyhint="search" aria-label="Buscar filme pelo título"></label></div><div class="cn-chips" id="cn-ch">${chipsHtml()}</div><div id="cn-res">${results()}</div><p class="cn-sy" id="cn-stor"></p><p class="cn-sy" id="cn-sy">${syLine()}</p></div>`;
  };
  const infoLine = m => {
    const L = [];
    if (hasLocal(m.id)) L.push(`Arquivo guardado neste aparelho: ${esc(m.fileName || 'vídeo')} · ${fmtSize(FSZ.get(m.id) || m.fileSize)}`);
    else if (m.url) L.push(isDriveHost(host(m.url)) ? `Cadastro com link do Google Drive (${esc(host(m.url))}). Esse link não toca como vídeo. Edite o filme e importe o arquivo baixado.` : `Cadastro antigo com link externo (${esc(host(m.url))}). Para não depender do link, edite o filme e importe o arquivo.`);
    else if (m.fileName) L.push(`O arquivo “${esc(m.fileName)}” (${fmtSize(m.fileSize)}) não está neste aparelho. Use “Anexar arquivo” e escolha o mesmo vídeo.`);
    return L.length ? `<p class="cn-src">${L.join('<br>')}</p>` : '';
  };
  const detail = m => `<div class="cn-root"><div class="cn-hd"><span style="display:inline-flex;align-items:center;gap:10px"><button type="button" class="cn-ib" onclick="CN.back()" aria-label="Voltar">${IC.left}</button><b style="font-size:18px">Detalhes</b></span></div><div id="cn-live" class="cn-bn" role="status" hidden></div>${stateBanner()}${hero(m, true)}${infoLine(m)}</div>`;
  P.cin = () => {
    const m = st.v === 'det' ? mv(st.id) : null;
    hyd();
    if (m) return detail(m);
    st.v = 'home';
    return catalog();
  };
  /* atualiza a tela sem perder o foco da busca nem interromper o filme */
  const refreshUI = () => {
    if (typeof page === 'undefined' || page !== 'cin' || W.open) return;
    if (st.v === 'det') { render(); return; }
    const r = document.getElementById('cn-res');
    if (r && list().length) { document.getElementById('cn-ch').innerHTML = chipsHtml(); r.innerHTML = results(); hyd(); } else render();
  };

  /* ================= exclusão ================= */
  const askDel = m => confirm('Excluir “' + m.title + '”?\n\n' + (hasLocal(m.id) ? 'O arquivo de vídeo (' + fmtSize(FSZ.get(m.id)) + ') será apagado deste aparelho e o espaço será liberado. ' : '') + 'O progresso salvo também é apagado. Esta ação não pode ser desfeita.');
  const doDel = async id => {
    const m = mv(id);
    if (!m) return;
    let freed = 0;
    if (hasLocal(id) || m.hasCover) {
      try { freed = await Store.drop(id); } catch (e) { say('Não foi possível apagar o arquivo: ' + errMsg(e) + ' O filme não foi excluído.'); return; }
    }
    HAS.delete(id); FSZ.delete(id); dropCov(id);
    const c = cn(), i = c.movies.findIndex(x => x && x.id === id), tomb = { id, del: 1, u: Date.now() };
    if (i >= 0) c.movies[i] = tomb; else c.movies.push(tomb);
    delete c.prog[id]; delete c.seen[id];
    persist();
    bcast({ t: 'ci-b', m: [tomb] });
    hook('movieDeleted', id);
    st.v = 'home';
    say('Filme excluído' + (freed ? ' · ' + fmtSize(freed) + ' liberados' : '') + '.');
    if (history.state && history.state.cv && !history.state.w) { try { history.back(); return; } catch (e) {} }
    render();
  };

  /* ================= formulário: adicionar / editar (importação com barra de progresso) ================= */
  const openForm = (m, attachMode) => {
    if (IMP.active) { say('Aguarde: há uma importação em andamento.'); return; }
    const v = m || {}, md = $('#md'), had = !!(m && hasLocal(m.id)), FU = [];
    const ch = { video: null, probe: null, cover: null, delCover: false, subs: [] };
    let busy = false;
    md.onclick = null;
    md.innerHTML = `<form class="box cn-form" novalidate autocomplete="off"><h3>${m ? 'Editar filme' : 'Adicionar filme'}</h3>
<div class="cn-fm" id="cn-fm" role="alert" hidden></div>
${attachMode && m && !had ? `<div class="cn-fm wa">Este filme não tem arquivo neste aparelho. Escolha o arquivo de vídeo abaixo.</div>` : ''}
${m && v.url && !had ? `<div class="cn-fm wa">Este filme usa um link externo (cadastro antigo). Escolha o arquivo de vídeo para passar a tocá-lo daqui, sem depender do link.</div>` : ''}
<label>Título *<input name="title" maxlength="140" value="${esc(v.title)}" required></label>
<label class="cn-drop" id="cn-drop" tabindex="0" role="button" aria-label="Escolher arquivo de vídeo">${IC.up}<b id="cn-fn">${had ? 'Trocar o arquivo de vídeo' : 'Escolher arquivo de vídeo'}</b><small id="cn-fi">${had ? esc(v.fileName || '') + ' · ' + fmtSize(FSZ.get(v.id) || v.fileSize) + ' (mantido se você não escolher outro)' : 'MP4, WebM, M4V, MOV e outros formatos que o navegador reproduz. Fica guardado só neste aparelho.'}</small><input type="file" name="video" class="cn-vh" accept="${VIDEO_ACCEPT}"></label>
<p class="cn-any">No celular, este botão pode abrir só a galeria de fotos e vídeos. Se o seu filme está em Downloads, no cartão ou baixado do Google Drive, <button type="button" class="cn-lk" id="cn-any">procure em todos os arquivos</button>. O ARCO não se conecta ao Google Drive: baixe o vídeo para o aparelho primeiro.</p>
<input type="file" name="videoany" class="cn-vh" tabindex="-1" aria-hidden="true">
<div class="cn-cvrow"><div class="cn-cvp" id="cn-cvp">sem capa</div><div><label class="cn-btn g sm" style="margin:0 6px 6px 0">Escolher capa (imagem)<input type="file" name="cover" class="cn-vh" accept="image/*"></label><button type="button" class="cn-btn g sm" id="cn-cvx" hidden>Remover capa</button><br><small>Sem capa, usamos um quadro do vídeo.</small></div></div>
<label>Descrição<textarea name="synopsis" rows="4" maxlength="3000">${esc(v.synopsis)}</textarea></label>
<div class="cn-two"><label>Ano de lançamento<input name="year" type="number" inputmode="numeric" min="1888" max="2100" step="1" value="${v.year ? esc(v.year) : ''}"></label><label>Duração <small>(preenche sozinha)</small><input name="dur" placeholder="1h45" value="${v.dur ? esc(fmtDur(v.dur).replace(/ /g, '')) : ''}"></label></div>
<label>Categoria(s) <small>separe por vírgula</small><input name="genres" value="${esc(gen(v).join(', '))}"></label>
<div class="cn-gsug" id="cn-gsug">${GENRES.map(g => `<button type="button" class="cn-chip" data-gs="${esc(g)}">${esc(g)}</button>`).join('')}</div>
<label>Legendas <small>(opcional — arquivos .vtt ou .srt)</small><input type="file" name="subs" accept=".vtt,.srt,text/vtt,application/x-subrip,text/plain" multiple style="margin-top:5px;color:#ccc"></label>
<div id="cn-sl" style="font-size:12.5px;color:#9a9a9a;margin:-6px 0 12px"></div>
<label class="cn-ck"><input type="checkbox" name="feat"${v.feat ? ' checked' : ''}><span>Mostrar em Destaques ★</span></label>
<label class="cn-ck"><input type="checkbox" name="rights"${v.rights ? ' checked' : ''}><span>Confirmo que este conteúdo é meu, é de domínio público ou tenho autorização para reproduzi-lo.</span></label>
<div class="cn-prw" id="cn-prw" hidden><div class="cn-prb" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="cn-pb"><b></b></div><div class="cn-prt" id="cn-pt" aria-live="polite"></div></div>
<div class="cn-fa"><button class="cn-btn" id="cn-save">Salvar</button><button type="button" class="cn-btn g" id="cn-cancel">Cancelar</button>${m ? `<button type="button" class="cn-btn g" id="cn-dl" style="color:#ff8a83">${IC.trash}Excluir</button>` : ''}</div></form>`;
    md.className = 'on';
    const fr = md.firstChild, el = n => fr.elements[n], val = n => (el(n).value || '').trim();
    const q = s => fr.querySelector(s);
    const close = () => { md.className = ''; FU.forEach(u => URL.revokeObjectURL(u)); FU.length = 0; };
    const msg = (t, k) => { const b = q('#cn-fm'); b.hidden = !t; b.className = 'cn-fm ' + (k || 'er'); b.textContent = t || ''; if (t) b.scrollIntoView({ block: 'nearest' }); };
    const lock = b => { fr.querySelectorAll('input,textarea,button').forEach(x => { if (x.id !== 'cn-cancel') x.disabled = b; }); q('#cn-drop').style.pointerEvents = b ? 'none' : ''; };
    const prog = (f, b) => {
      const pct = Math.min(100, Math.round(f * 100));
      q('#cn-pb b').style.width = pct + '%'; q('#cn-pb').setAttribute('aria-valuenow', pct);
      q('#cn-pt').textContent = 'Importando… ' + pct + '% (' + fmtSize(b) + ' de ' + fmtSize(ch.video.size) + ')';
    };
    const setDrop = (k, f, pr, why) => {
      const d = q('#cn-drop'); d.className = 'cn-drop' + (k === 'ok' ? ' ok' : k === 'err' ? ' er' : '');
      q('#cn-fn').textContent = k === 'err' ? 'Escolher outro arquivo' : f ? f.name : 'Escolher arquivo de vídeo';
      q('#cn-fi').textContent = k === 'busy' ? 'Verificando o arquivo…' : k === 'ok' ? '✓ Compatível · ' + fmtSize(f.size) + (pr && pr.dur ? ' · ' + fmtDur(Math.round(pr.dur / 60)) : '') + (pr && pr.w ? ' · ' + pr.w + '×' + pr.h : '') : k === 'err' ? why : '';
    };
    const showCover = u => { const c = q('#cn-cvp'); c.textContent = u ? '' : 'sem capa'; c.style.backgroundImage = u ? 'url("' + u + '")' : ''; q('#cn-cvx').hidden = !u; };
    if (safeUrl(v.cover)) showCover(safeUrl(v.cover));
    else if (v.hasCover) getCov(v.id).then(u => { if (u && !ch.cover && !ch.delCover) showCover(u); });

    /* Validação do arquivo de vídeo: tipo MIME + extensão + assinatura binária; depois decodificação real (probe). */
    const pick = async f => {
      msg('');
      if (!f.size) { msg('O arquivo está vazio.'); return; }
      if (/^image\//.test(f.type || '')) { msg('Esse arquivo é uma imagem, não um vídeo. Para a capa use “Escolher capa”. Para o filme, escolha MP4, WebM, M4V, MOV ou outro vídeo.'); return; }
      const kind = await sniff(f);
      if (kind === 'image') { msg('O conteúdo desse arquivo é uma imagem, não um vídeo. Para a capa use “Escolher capa”.'); return; }
      if (kind === 'other') { msg('Esse arquivo não é um vídeo (parece um documento, página ou áudio). Se veio de um link do Google Drive, baixe o vídeo de verdade para o aparelho.'); return; }
      if (!isVideo(f) && kind !== 'video') { msg('Não consegui reconhecer esse arquivo como vídeo. Escolha MP4, WebM, M4V, MOV ou outro formato de vídeo.'); return; }
      ch.video = f; ch.probe = null; setDrop('busy', f);
      if (!val('title')) el('title').value = nameToTitle(f.name);
      try {
        const pr = await probe(f, true);
        if (ch.video !== f) return;
        ch.probe = pr; setDrop('ok', f, pr);
        if (pr.dur > 0 && !val('dur')) el('dur').value = fmtDur(Math.round(pr.dur / 60)).replace(/ /g, '');
        if (pr.poster && !ch.cover && !v.hasCover && !safeUrl(v.cover)) { const u = URL.createObjectURL(pr.poster); FU.push(u); showCover(u); }
        if (m && v.fileSize && f.size !== v.fileSize && attachMode) msg('Atenção: este arquivo tem tamanho diferente do original (' + fmtSize(v.fileSize) + '). Se for outra versão, o ponto salvo pode não coincidir.', 'wa');
      } catch (e) { if (ch.video !== f) return; ch.video = null; const t = probeMsg(e); setDrop('err', null, null, t); msg(t); }
    };
    /* dois caminhos para o mesmo fluxo: seletor com filtro de vídeo e seletor geral de arquivos */
    ['video', 'videoany'].forEach(n => el(n).addEventListener('change', () => { const f = el(n).files[0]; el(n).value = ''; if (f) pick(f); }));
    q('#cn-any').onclick = () => { if (!busy) el('videoany').click(); };
    const dz = q('#cn-drop');
    dz.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el('video').click(); } });
    ['dragenter', 'dragover'].forEach(t => dz.addEventListener(t, e => { e.preventDefault(); dz.classList.add('dr'); }));
    ['dragleave', 'drop'].forEach(t => dz.addEventListener(t, e => { e.preventDefault(); dz.classList.remove('dr'); }));
    dz.addEventListener('drop', e => { const f = e.dataTransfer && e.dataTransfer.files[0]; if (f) pick(f); });
    el('cover').addEventListener('change', async () => {
      const f = el('cover').files[0]; el('cover').value = '';
      if (!f) return;
      const kind = await sniff(f);
      if (!/^image\//.test(f.type) && kind !== 'image') { msg('A capa precisa ser uma imagem (JPG, PNG, WebP…).'); return; }
      ch.cover = f; ch.delCover = false; const u = URL.createObjectURL(f); FU.push(u); showCover(u); msg('');
    });
    q('#cn-cvx').onclick = () => { ch.cover = null; ch.delCover = true; showCover(''); };
    el('subs').addEventListener('change', async () => {
      const L = [...el('subs').files]; el('subs').value = ''; ch.subs = []; const bad = [];
      for (const f of L) {
        try {
          if (f.size > 5242880) throw new Error('grande');
          ch.subs.push({ l: f.name.replace(/\.[^.]+$/, ''), vtt: toVtt(await decodeText(f)) });
        } catch (e) { bad.push(f.name); }
      }
      q('#cn-sl').textContent = (ch.subs.length ? ch.subs.length + ' legenda(s) selecionada(s): ' + ch.subs.map(s => s.l).join(', ') + '. ' : '') + (bad.length ? 'Não foi possível ler: ' + bad.join(', ') + ' (use .vtt ou .srt com até 5 MB).' : '');
    });
    const syncChips = () => {
      const have = new Set(val('genres').split(/[,;]+/).map(x => norm(x.trim())).filter(Boolean));
      fr.querySelectorAll('[data-gs]').forEach(b => b.classList.toggle('on', have.has(norm(b.dataset.gs))));
    };
    el('genres').addEventListener('input', syncChips); syncChips();
    q('#cn-gsug').addEventListener('click', e => {
      const b = e.target.closest('[data-gs]'); if (!b) return;
      const cur = val('genres').split(/[,;]+/).map(x => x.trim()).filter(Boolean), k = norm(b.dataset.gs), i = cur.findIndex(x => norm(x) === k);
      if (i >= 0) cur.splice(i, 1); else cur.push(b.dataset.gs);
      el('genres').value = cur.join(', '); syncChips();
    });
    q('#cn-cancel').onclick = () => {
      if (IMP.active && IMP.ctl) { IMP.ctl.cancel = true; q('#cn-cancel').textContent = 'Cancelando…'; q('#cn-cancel').disabled = true; return; }
      close();
    };
    if (m) q('#cn-dl').onclick = () => { if (!busy && askDel(m)) { close(); doDel(m.id); } };

    fr.onsubmit = async e => {
      e.preventDefault();
      if (busy) return;
      const fail = (t, n) => { msg(t); if (n) el(n).focus(); };
      const title = val('title');
      if (!title) return fail('Informe o título do filme.', 'title');
      let year = 0;
      if (val('year')) { year = +val('year'); if (!(year >= 1888 && year <= new Date().getFullYear() + 2)) return fail('Ano de lançamento inválido.', 'year'); }
      const dur = parseDur(val('dur'));
      if (isNaN(dur) || dur > 1500) return fail('Duração inválida. Use minutos (105) ou 1h45.', 'dur');
      if (!ch.video && !had && !(m && v.url)) return fail('Escolha o arquivo de vídeo do filme.');
      if (!el('rights').checked) return fail('Confirme que você pode reproduzir este conteúdo para salvar.', 'rights');
      if (ch.video && hasState === 'err') return fail(hasErr || 'Armazenamento local indisponível.');
      const genres = []; val('genres').split(/[,;]+/).map(x => x.trim()).filter(Boolean).forEach(g => { if (!genres.some(x => norm(x) === norm(g))) genres.push(g); });
      busy = true; lock(true); msg('');
      const id = m ? m.id : uid(), warn = [];
      let newMovie = !m, stored = false;
      try {
        if (ch.video) {
          const f = ch.video;
          q('#cn-prw').hidden = false; q('#cn-pt').textContent = 'Preparando…';
          if (!ch.probe) ch.probe = await probe(f, true);
          try {
            if (navigator.storage && navigator.storage.estimate) {
              const est = await navigator.storage.estimate();
              if (est.quota && est.usage != null && f.size > est.quota - est.usage) throw Object.assign(new Error('quota'), { name: 'QuotaExceededError' });
            }
          } catch (x) { if (x && x.name === 'QuotaExceededError') throw x; }
          try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (x) {}
          IMP.active = true; IMP.ctl = { cancel: false };
          await Store.put(id, f, prog, IMP.ctl);
          stored = true; HAS.add(id); FSZ.set(id, f.size);
        }
        let hasCover = !!(m && m.hasCover);
        try {
          if (ch.cover) { await Store.assetPut('cover:' + id, { blob: await resizeImage(ch.cover, 480, 720) }); hasCover = true; dropCov(id); }
          else if (ch.delCover) { await Store.assetDel('cover:' + id); hasCover = false; dropCov(id); }
          else if (!hasCover && !safeUrl(v.cover) && ch.probe && ch.probe.poster) { await Store.assetPut('cover:' + id, { blob: ch.probe.poster }); hasCover = true; dropCov(id); }
        } catch (x) { warn.push('A capa não pôde ser salva (' + errMsg(x) + ')'); }
        try { if (ch.subs.length) await Store.assetPut('subs:' + id, { list: ch.subs }); } catch (x) { warn.push('As legendas não puderam ser salvas (' + errMsg(x) + ')'); }
        const rec = { title, synopsis: val('synopsis'), year, genres: genres.slice(0, 8), dur: dur || (ch.probe && ch.probe.dur ? Math.round(ch.probe.dur / 60) : (m ? m.dur : 0)) || 0, hasCover, feat: el('feat').checked, rights: true };
        if (ch.video) Object.assign(rec, { fileName: ch.video.name, fileSize: ch.video.size, fileType: ch.video.type || guessType(ch.video.name), url: '', ql: '', alts: [] });
        const c0 = cn(); let mm;
        if (m) { Object.assign(m, rec, { u: Date.now() }); mm = m; }
        else { mm = Object.assign({ id, added: Date.now(), u: Date.now() }, rec); c0.movies.push(mm); st.q = ''; st.g = ''; st.v = 'home'; }
        persist();
        bcast({ t: 'ci-b', m: [mm] });
        hook('movieChanged', JSON.parse(JSON.stringify(mm)));
        if (stored) hook('fileStored', id);
        FILES = FILES.filter(x => x.mid !== id);
        IMP.active = false; IMP.ctl = null;
        md.innerHTML = `<div class="box cn-form"><div class="cn-ok">${IC.check}<h3>${stored ? 'Importação concluída' : 'Alterações salvas'}</h3><p><b>${esc(title)}</b>${stored ? '<br>Arquivo guardado neste aparelho (' + fmtSize(ch.video.size) + '). Continua disponível depois de recarregar a página.' : ''}${warn.length ? '<br><span style="color:#ffd08a">' + esc(warn.join(' ')) + '</span>' : ''}</p><div class="cn-fa" style="justify-content:center">${playable(mm) ? `<button type="button" class="cn-btn" id="cn-go">${IC.play}Assistir agora</button>` : ''}<button type="button" class="cn-btn g" id="cn-x">Fechar</button></div></div></div>`;
        const x = md.querySelector('#cn-x'), g = md.querySelector('#cn-go');
        if (x) { x.onclick = () => { close(); }; x.focus(); }
        if (g) g.onclick = () => { close(); CN.play(mm.id, 1); };
        RD();
      } catch (err) {
        IMP.active = false; IMP.ctl = null;
        if (stored && newMovie) { HAS.delete(id); FSZ.delete(id); Store.drop(id).catch(() => {}); dropCov(id); }
        else if (!stored && ch.video && newMovie) { Store.drop(id).catch(() => {}); }
        busy = false; lock(false); q('#cn-prw').hidden = true;
        const c = q('#cn-cancel'); c.textContent = 'Cancelar'; c.disabled = false;
        msg(err === CANCEL ? errMsg(CANCEL) : (ch.video && /^(timeout|media)$/.test(String(err && err.message)) ? probeMsg(err) : errMsg(err)), err === CANCEL ? 'wa' : 'er');
      }
    };
    const f0 = el('title'); if (f0 && !m) f0.focus();
  };

  /* ================= API pública usada pelos botões da página ================= */
  const CN = window.CN = {
    v: 2,
    ie(img) { img.remove(); },
    sc(btn, d) { const r = btn.parentNode.querySelector('.cn-row'); if (r) r.scrollBy({ left: d * r.clientWidth * 0.85, behavior: 'smooth' }); },
    q(v) { st.q = v; const r = $('#cn-res'); if (r) { r.innerHTML = results(); hyd(); } },
    g(x) { st.g = st.g === x ? '' : x; const c = $('#cn-ch'); if (c) c.innerHTML = chipsHtml(); const r = $('#cn-res'); if (r) { r.innerHTML = results(); hyd(); } },
    open(id) {
      if (!mv(id)) return;
      st.sy = window.scrollY || 0; st.v = 'det'; st.id = id;
      try { history.pushState({ p: 'cin', cv: 'd:' + id }, ''); } catch (e) {}
      render(); window.scrollTo(0, 0);
    },
    back() {
      if (history.state && history.state.cv && !history.state.w) { history.back(); return; }
      st.v = 'home'; render();
    },
    add() { openForm(null); },
    edit(id, attach) { const m = mv(id); if (m) openForm(m, attach); },
    del(id) { const m = mv(id); if (m && askDel(m)) doDel(id); },
    feat(id) { const m = mv(id); if (m) { m.feat = !m.feat; m.u = Date.now(); persist(); bcast({ t: 'ci-b', m: [m] }); hook('movieChanged', JSON.parse(JSON.stringify(m))); RD(); } },
    play(id, fromStart) { const m = mv(id); if (!m) return; openPlayer(m, fromStart ? 0 : canResume(m) ? prog(id).t : 0); },
    /* baixa o arquivo guardado (forma manual e real de levar o vídeo para outro aparelho) */
    async save(id) {
      const m = mv(id); if (!m) return;
      try {
        const b = await Store.blob(id);
        if (!b) { say('O arquivo deste filme não está neste aparelho.'); return; }
        const u = URL.createObjectURL(b), a = document.createElement('a');
        a.href = u; a.download = m.fileName || (m.title + '.mp4');
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(u), 60000);
      } catch (e) { say(errMsg(e)); }
    },
    /* remove arquivos guardados que não pertencem a nenhum filme da biblioteca */
    async clean() {
      const live = new Set(list().map(m => m.id)), L = [...HAS].filter(id => !live.has(id));
      if (!L.length || !confirm('Apagar ' + L.length + ' arquivo(s) de vídeo que não pertencem a nenhum filme da biblioteca? Isso libera o espaço deles.')) return;
      let freed = 0;
      for (const id of L) { try { freed += await Store.drop(id); HAS.delete(id); FSZ.delete(id); dropCov(id); } catch (e) { say(errMsg(e)); break; } }
      say(fmtSize(freed) + ' liberados.'); updStor();
    }
  };

  /* ================= SINCRONIZAÇÃO FUTURA (ponto de extensão; nada é enviado sem um adapter registrado) =================
     window.ARCO_CINEMA_SYNC.register(adapter) — o adapter é implementado por você, com o backend/credenciais REAIS que existirem.
     Métodos opcionais, todos chamados dentro de try/catch (falha do adapter nunca quebra o Cinema):
       movieChanged(meta)   metadados criados/alterados (cópia simples, sem arquivos)
       movieDeleted(id)     filme excluído
       fileStored(id)       um arquivo de vídeo terminou de ser importado neste aparelho
     O adapter pode usar window.ARCO_CINEMA_SYNC.store: { has(id), getFile(id):Promise<Blob|null>, putFile(id, File):Promise } para
     enviar/baixar os binários (por exemplo, para um bucket). Os metadados continuam em S.cine (já exportáveis). */
  const SyncAd = { a: null };
  const hook = (fn, ...a) => {
    try { const x = SyncAd.a && SyncAd.a[fn]; if (typeof x === 'function') Promise.resolve(x.apply(SyncAd.a, a)).catch(() => {}); } catch (e) {}
  };
  window.ARCO_CINEMA_SYNC = {
    register(a) { SyncAd.a = a && typeof a === 'object' ? a : null; return !!SyncAd.a; },
    store: {
      has: id => hasLocal(id),
      getFile: id => Store.blob(id),
      async putFile(id, file) { await Store.put(id, file, null, null); HAS.add(id); FSZ.set(id, file.size); refreshUI(); }
    }
  };

  /* ================= reprodutor ================= */
  const SV = d => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${d}</svg>`;
  const PI = {
    play: SV('<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>'),
    pause: SV('<rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/>'),
    back: SV('<path d="M15 5l-7 7 7 7"/>'),
    b10: SV('<path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4v4.5h4.5"/><text x="12" y="15.4" font-size="7.5" font-weight="700" text-anchor="middle" fill="currentColor" stroke="none" font-family="system-ui,sans-serif">10</text>'),
    f10: SV('<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v4.5h-4.5"/><text x="12" y="15.4" font-size="7.5" font-weight="700" text-anchor="middle" fill="currentColor" stroke="none" font-family="system-ui,sans-serif">10</text>'),
    vol: SV('<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>'),
    mute: SV('<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>'),
    cc: SV('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 10.2a2.2 2.2 0 1 0 0 3.6M16.5 10.2a2.2 2.2 0 1 0 0 3.6"/>'),
    set: SV('<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>'),
    fs: SV('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
    fsx: SV('<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>'),
    ext: SV('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
    retry: SV('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>')
  };
  const W = { open: false, m: null, local: false, obj: '', srcs: [], qi: 0, c: null, h: null, levels: null, lvSel: -1, lvCur: -1, start: 0, err: null, pushed: false, menu: '', drag: 0, hover: 0, loading: false, cleaning: 0, subMsg: [], blobs: [], lastSave: 0, lastT: 0, ht: 0, lt: 0, wt: 0, tapT: 0, tapAt: 0, tapSide: 0, ripT: 0, gen: 0 };
  let root = null, v = null, E = {};
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  const dur = () => v && isFinite(v.duration) ? v.duration : 0;
  const subTracks = () => Array.from(v.textTracks || []).filter(t => t.kind === 'subtitles' || t.kind === 'captions');

  const ensureUI = () => {
    if (root) return;
    root = document.createElement('div');
    root.id = 'cnp';
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Reprodutor de filmes');
    root.innerHTML = `<div class="cn-st" tabindex="-1"><video playsinline webkit-playsinline preload="auto"></video><div class="cn-tap"></div>
<div class="cn-mid"><button type="button" class="cn-big" data-a="pp" aria-label="Reproduzir">${PI.play}</button><div class="cn-spin" role="status" aria-label="Carregando"></div></div>
<div class="cn-slow">A conexão parece lenta… continuando a carregar.</div><div class="cn-rip"></div>
<div class="cn-top"><button type="button" class="cn-pi" data-a="close" aria-label="Voltar">${PI.back}</button><div class="cn-tt"><b></b><span></span></div></div>
<div class="cn-err" role="alert"><h3></h3><p></p><div class="cn-bts"></div></div><div class="cn-mn" hidden></div>
<div class="cn-bot"><div class="cn-seek"><div class="cn-trk"><div class="cn-buf"></div><div class="cn-prg"></div></div><input type="range" min="0" max="1000" step="1" value="0" aria-label="Barra de progresso do filme"><div class="cn-tip"></div></div>
<div class="cn-ctl"><button type="button" class="cn-pi" data-a="pp" aria-label="Reproduzir">${PI.play}</button><button type="button" class="cn-pi" data-a="b10" aria-label="Voltar 10 segundos">${PI.b10}</button><button type="button" class="cn-pi" data-a="f10" aria-label="Avançar 10 segundos">${PI.f10}</button>
<div class="cn-vol"><button type="button" class="cn-pi" data-a="mute" aria-label="Silenciar">${PI.vol}</button><input type="range" min="0" max="1" step="0.02" value="1" aria-label="Volume"></div>
<span class="cn-tm">0:00 / 0:00</span><span class="cn-f"></span>
<button type="button" class="cn-pi tx" data-a="m:sp" aria-label="Velocidade de reprodução">1×</button><button type="button" class="cn-pi" data-a="m:cc" aria-label="Legendas">${PI.cc}</button><button type="button" class="cn-pi" data-a="m:ql" aria-label="Qualidade" style="display:none">${PI.set}</button><button type="button" class="cn-pi" data-a="fs" aria-label="Tela cheia">${PI.fs}</button></div></div></div><input type="file" accept=".vtt,.srt,text/vtt,application/x-subrip,text/plain" hidden>`;
    document.body.appendChild(root);
    const q = s => root.querySelector(s);
    v = q('video');
    E = { st: q('.cn-st'), tap: q('.cn-tap'), ttl: q('.cn-tt b'), sub: q('.cn-tt span'), pp: q('.cn-ctl [data-a="pp"]'), mute: q('[data-a="mute"]'), sp: q('[data-a="m:sp"]'), ql: q('[data-a="m:ql"]'), fs: q('[data-a="fs"]'), rg: q('.cn-seek input'), seek: q('.cn-seek'), prg: q('.cn-prg'), buf: q('.cn-buf'), tip: q('.cn-tip'), tm: q('.cn-tm'), vl: q('.cn-vol input'), mn: q('.cn-mn'), rip: q('.cn-rip'), eh: q('.cn-err h3'), ep: q('.cn-err p'), eb: q('.cn-bts'), top: q('.cn-top'), bot: q('.cn-bot'), file: q('input[type=file]') };

    root.addEventListener('click', e => {
      const b = e.target.closest('[data-a]');
      if (!b) { if (W.menu && !e.target.closest('.cn-mn')) closeMenu(); return; }
      if (e.detail > 0) setTimeout(() => b.blur(), 0);
      const a = b.dataset.a;
      if (a === 'pp') toggle();
      else if (a === 'close') closePlayer();
      else if (a === 'b10') skip(-10);
      else if (a === 'f10') skip(10);
      else if (a === 'mute') toggleMute();
      else if (a === 'fs') toggleFs();
      else if (a === 'retry') retry();
      else if (a === 'ext') openExt();
      else if (a.startsWith('m:')) openMenu(a.slice(2));
    });
    E.mn.addEventListener('click', e => {
      const b = e.target.closest('[data-m]'); if (!b) return;
      const i = b.dataset.m.indexOf(':'), k = b.dataset.m.slice(0, i), x = b.dataset.m.slice(i + 1);
      if (k === 'sp') setRate(+x);
      else if (k === 'cc') setSub(x);
      else if (k === 'lv') setLevel(+x);
      else if (k === 'src') switchSrc(+x);
      else if (k === 'file') { E.file.click(); }
      closeMenu();
    });
    E.tap.addEventListener('pointerup', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (W.menu) { closeMenu(); return; }
      const now = Date.now(), r = E.tap.getBoundingClientRect(), side = (e.clientX - r.left) < r.width / 2 ? -1 : 1, mouse = e.pointerType === 'mouse';
      if (now - W.tapAt < 320 && side === W.tapSide) {
        clearTimeout(W.tapT); W.tapAt = 0;
        if (mouse) { toggle(); toggleFs(); } else { skip(side * 10); }
        return;
      }
      W.tapAt = now; W.tapSide = side; clearTimeout(W.tapT);
      if (mouse) { toggle(); showCtl(); }
      else W.tapT = setTimeout(() => { W.tapAt = 0; root.classList.contains('cn-show') ? hideCtl() : showCtl(); }, 260);
    });
    E.st.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') showCtl(); });
    [E.top, E.bot].forEach(x => { x.addEventListener('pointerenter', () => { W.hover = 1; }); x.addEventListener('pointerleave', () => { W.hover = 0; showCtl(); }); });
    E.rg.addEventListener('input', () => {
      W.drag = 1; E.seek.classList.add('dr');
      E.prg.style.width = (E.rg.value / 10) + '%';
      E.tm.textContent = clock(E.rg.value / 1000 * dur()) + ' / ' + clock(dur());
    });
    E.rg.addEventListener('change', () => {
      if (dur()) v.currentTime = E.rg.value / 1000 * dur();
      W.drag = 0; E.seek.classList.remove('dr'); showCtl();
    });
    E.seek.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse' || !dur()) return;
      const r = E.seek.getBoundingClientRect(), x = Math.min(Math.max(e.clientX - r.left, 0), r.width);
      E.tip.style.left = x + 'px'; E.tip.textContent = clock(x / r.width * dur()); E.tip.style.opacity = 1;
    });
    E.seek.addEventListener('pointerleave', () => { E.tip.style.opacity = 0; });
    E.vl.addEventListener('input', () => { v.volume = +E.vl.value; v.muted = +E.vl.value === 0; });
    E.file.addEventListener('change', async () => {
      const f = E.file.files[0]; E.file.value = '';
      if (!f) return;
      try {
        const label = f.name.replace(/\.[^.]+$/, '');
        addTrack(label, toVtt(await decodeText(f)), true); setPref({ sub: label });
      } catch (e) { W.subMsg.push('Arquivo de legenda inválido (use .vtt ou .srt).'); }
      if (W.menu === 'cc') renderMenu();
    });
    const on = (t, f) => v.addEventListener(t, f);
    on('loadstart', () => { if (W.open && !W.cleaning) { W.loading = true; sync(); } });
    on('loadedmetadata', onMeta);
    on('durationchange', updTime);
    on('timeupdate', () => { updTime(); if (v.currentTime > 0) W.lastT = v.currentTime; if (!v.paused && Date.now() - W.lastSave > 10000) saveProg(); });
    on('progress', updBuf);
    on('waiting', () => { if (!W.open) return; W.loading = true; clearTimeout(W.wt); W.wt = setTimeout(() => root.classList.add('cn-slw'), 12000); sync(); });
    ['canplay', 'playing', 'seeked', 'loadeddata'].forEach(t => on(t, () => { W.loading = false; clearTimeout(W.wt); root.classList.remove('cn-slw'); sync(); }));
    on('suspend', () => { if (v.paused) { W.loading = false; sync(); } });
    on('play', () => { sync(); showCtl(); });
    on('pause', () => { if (!W.cleaning) saveProg(); sync(); showCtl(); });
    on('ended', () => { saveProg(); sync(); showCtl(true); });
    on('volumechange', () => {
      E.vl.value = v.muted ? 0 : v.volume;
      E.vl.style.setProperty('--v', (v.muted ? 0 : v.volume) * 100 + '%');
      E.mute.innerHTML = v.muted || v.volume === 0 ? PI.mute : PI.vol;
      E.mute.setAttribute('aria-label', v.muted ? 'Ativar som' : 'Silenciar');
      if (W.open) setPref({ vol: v.volume, muted: v.muted });
    });
    on('ratechange', () => { E.sp.textContent = (v.playbackRate === 1 ? '1' : v.playbackRate) + '×'; });
    on('error', onErr);
    v.addEventListener('webkitendfullscreen', () => { sync(); });
    ['fullscreenchange', 'webkitfullscreenchange'].forEach(t => document.addEventListener(t, () => {
      const f = !!fsEl();
      E.fs.innerHTML = f ? PI.fsx : PI.fs; E.fs.setAttribute('aria-label', f ? 'Sair da tela cheia' : 'Tela cheia');
      if (!f) { try { screen.orientation && screen.orientation.unlock && screen.orientation.unlock(); } catch (e) {} }
    }));
  };

  const sync = () => {
    if (!root) return;
    const bad = !!W.err;
    root.classList.toggle('cn-bad', bad);
    root.classList.toggle('cn-load', !bad && W.loading);
    root.classList.toggle('cn-paused', !bad && v.paused && !W.loading);
    E.pp.innerHTML = v.paused ? PI.play : PI.pause;
    E.pp.setAttribute('aria-label', v.paused ? 'Reproduzir' : 'Pausar');
  };
  const showCtl = stick => {
    if (!root) return;
    root.classList.add('cn-show'); clearTimeout(W.ht);
    if (stick || W.menu || W.err || W.hover || v.paused) return;
    W.ht = setTimeout(() => { if (!v.paused && !W.menu && !W.hover) root.classList.remove('cn-show'); }, 3200);
  };
  const hideCtl = () => { if (!W.err && !W.menu) root.classList.remove('cn-show'); };
  const updBuf = () => {
    const d = dur(); if (!d) { E.buf.style.width = '0'; return; }
    let end = 0;
    for (let i = 0; i < v.buffered.length; i++) if (v.buffered.start(i) <= v.currentTime + 0.5 && v.buffered.end(i) >= end) end = v.buffered.end(i);
    E.buf.style.width = Math.min(100, end / d * 100) + '%';
  };
  const updTime = () => {
    if (!W.open) return;
    const d = dur(), t = v.currentTime || 0, live = v.duration === Infinity;
    E.rg.disabled = !d;
    if (!W.drag) {
      E.rg.value = d ? Math.round(t / d * 1000) : 0;
      E.prg.style.width = d ? Math.min(100, t / d * 100) + '%' : '0';
      E.tm.textContent = d ? clock(t) + ' / ' + clock(d) : live ? 'AO VIVO' : clock(t);
    }
    updBuf();
  };
  const updQL = () => { E.ql.style.display = (W.levels && W.levels.length > 1) || W.srcs.length > 1 ? '' : 'none'; };
  const rip = side => {
    E.rip.textContent = side < 0 ? '−10 s' : '+10 s';
    E.rip.style.left = side < 0 ? '12%' : 'auto'; E.rip.style.right = side > 0 ? '12%' : 'auto';
    E.rip.classList.add('on'); clearTimeout(W.ripT); W.ripT = setTimeout(() => E.rip.classList.remove('on'), 550);
  };
  const tryPlay = () => { const p = v.play(); if (p && p.catch) p.catch(() => sync()); };
  const toggle = () => { if (W.err) return; v.paused || v.ended ? tryPlay() : v.pause(); };
  const skip = s => { if (!dur()) return; v.currentTime = Math.max(0, Math.min(dur(), (v.currentTime || 0) + s)); rip(s); showCtl(); };
  const toggleMute = () => { v.muted = !v.muted; if (!v.muted && v.volume === 0) v.volume = 0.5; };
  const setRate = r => { v.playbackRate = r; setPref({ rate: r }); };
  const toggleFs = () => {
    if (fsEl()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
    const rq = E.st.requestFullscreen || E.st.webkitRequestFullscreen;
    if (rq) Promise.resolve(rq.call(E.st)).then(() => { try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }).catch(() => {});
    else if (v.webkitEnterFullscreen) { try { v.webkitEnterFullscreen(); } catch (e) {} }
  };
  const openExt = () => { const u = safeUrl(W.srcs[W.qi] && W.srcs[W.qi].u); if (u) window.open(u, '_blank', 'noopener,noreferrer'); };

  /* legendas (do arquivo guardado, do aparelho ou de links de cadastros antigos) */
  const addTrack = (label, vtt, show) => {
    const url = URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
    W.blobs.push(url);
    const t = document.createElement('track');
    t.kind = 'subtitles'; t.label = label; t.src = url;
    v.appendChild(t);
    if (show) subTracks().forEach(x => { x.mode = x === t.track ? 'showing' : 'disabled'; });
    else t.track.mode = 'disabled';
    if (W.menu === 'cc') renderMenu();
    return t;
  };
  const loadSubs = async m => {
    const pref = getPref().sub;
    try {
      if (W.local) {
        const a = await Store.assetGet('subs:' + m.id);
        if (a && Array.isArray(a.list) && W.open && W.m === m) a.list.forEach(s => addTrack(s.l, s.vtt, pref === s.l));
      }
    } catch (e) {}
    (Array.isArray(m.subs) ? m.subs : []).forEach(async s => {
      try {
        const txt = await fetchText(s.u);
        if (!W.open || W.m !== m) return;
        addTrack(s.l, toVtt(txt), pref === s.l);
      } catch (e) {
        if (!W.open || W.m !== m) return;
        W.subMsg.push((s.l || 'Legenda') + ': ' + (e && e.message === 'formato' ? 'formato não reconhecido (use .vtt ou .srt).' : e instanceof TypeError ? 'bloqueada pelo servidor (CORS) ou inacessível.' : String(e && e.message || e)));
        if (W.menu === 'cc') renderMenu();
      }
    });
  };
  const setSub = x => {
    const T = subTracks();
    T.forEach((t, i) => { t.mode = String(i) === x ? 'showing' : 'disabled'; });
    setPref({ sub: T[+x] ? T[+x].label : '' });
  };
  const lvLabel = (L, l) => (l.h ? l.h + 'p' : Math.round(l.br / 1000) + ' kbps') + (l.h && L.filter(z => z.h === l.h).length > 1 ? ' · ' + Math.round(l.br / 1000) + ' kbps' : '');
  const setLevel = i => { if (W.h && W.h.hls) { W.h.hls.currentLevel = i; W.lvSel = i; } };
  const switchSrc = i => { if (i === W.qi) return; const t = v.currentTime || 0, was = !v.paused; loadSource(i, t, was); };

  /* menus */
  const renderMenu = () => {
    const k = W.menu; let h = '';
    if (k === 'sp') {
      h = '<h4>Velocidade</h4>' + [0.5, 0.75, 1, 1.25, 1.5, 2].map(r => `<button type="button" class="cn-mi" data-m="sp:${r}"><i>${v.playbackRate === r ? '✓' : ''}</i>${r === 1 ? 'Normal' : r + '×'}</button>`).join('');
    } else if (k === 'cc') {
      const T = subTracks();
      h = '<h4>Legendas</h4>' + `<button type="button" class="cn-mi" data-m="cc:off"><i>${T.every(t => t.mode !== 'showing') ? '✓' : ''}</i>Desativadas</button>`
        + T.map((t, i) => `<button type="button" class="cn-mi" data-m="cc:${i}"><i>${t.mode === 'showing' ? '✓' : ''}</i>${esc(t.label || 'Legenda ' + (i + 1))}</button>`).join('')
        + '<button type="button" class="cn-mi" data-m="file:"><i></i>Carregar arquivo do aparelho…</button>'
        + W.subMsg.map(x => `<p class="er">${esc(x)}</p>`).join('')
        + (!T.length && !W.subMsg.length ? '<p>Este filme não tem legendas cadastradas.</p>' : '');
    } else if (k === 'ql') {
      if (W.levels && W.levels.length > 1) {
        const L = W.levels.slice().sort((a, b) => b.h - a.h || b.br - a.br), cur = W.levels.find(z => z.i === W.lvCur);
        h = '<h4>Qualidade</h4>' + `<button type="button" class="cn-mi" data-m="lv:-1"><i>${W.lvSel === -1 ? '✓' : ''}</i>Automática${cur && W.lvSel === -1 ? ' (' + esc(lvLabel(L, cur)) + ')' : ''}</button>`
          + L.map(l => `<button type="button" class="cn-mi" data-m="lv:${l.i}"><i>${W.lvSel === l.i ? '✓' : ''}</i>${esc(lvLabel(L, l))}</button>`).join('');
      } else h = '<h4>Qualidade</h4>' + W.srcs.map((s, i) => `<button type="button" class="cn-mi" data-m="src:${i}"><i>${W.qi === i ? '✓' : ''}</i>${esc(s.l)}</button>`).join('');
    }
    E.mn.innerHTML = h;
  };
  const openMenu = k => { if (W.menu === k) { closeMenu(); return; } W.menu = k; renderMenu(); E.mn.hidden = false; showCtl(true); };
  const closeMenu = () => { W.menu = ''; if (E.mn) E.mn.hidden = true; if (root && root.classList.contains('on')) showCtl(); };

  /* progresso (continua de onde parou) */
  const saveProg = () => {
    const m = W.m; if (!W.open || !m || !v || W.cleaning || W.start > 0) return;
    const d = v.duration, t = v.currentTime;
    if (!isFinite(d) || d <= 0 || !(t >= 0) || v.readyState < 1) return;
    if (!mv(m.id)) return;
    const c = cn(), old = c.prog[m.id];
    if (t < 5 && !old && !v.ended) return;
    const done = v.ended || d - t < Math.max(10, Math.min(120, d * 0.03));
    c.prog[m.id] = { t: done ? 0 : Math.floor(t), d: Math.floor(d), u: Date.now(), done };
    W.lastSave = Date.now();
    persist();
    bcast({ t: 'ci-b', p: { [m.id]: c.prog[m.id] } });
  };

  /* carregar / falhar. A URL temporária (blob:) do filme local é sempre revogada ao trocar de fonte ou fechar. */
  const revokeObj = () => { if (W.obj) { try { URL.revokeObjectURL(W.obj); } catch (e) {} W.obj = ''; } };
  const cleanSrc = () => {
    clearTimeout(W.lt); clearTimeout(W.wt);
    if (W.h) { W.h.destroy(); W.h = null; }
    W.cleaning = 1;
    try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) {}
    W.cleaning = 0;
    revokeObj();
  };
  const fail = o => {
    if (!W.open || W.err) return;
    W.err = o; W.loading = false; clearTimeout(W.lt); clearTimeout(W.wt);
    W.cleaning = 1; try { v.pause(); } catch (e) {} W.cleaning = 0;
    const ext = !W.local && safeUrl(W.srcs[W.qi] && W.srcs[W.qi].u), retry = o.retry !== false;
    E.eh.textContent = o.title; E.ep.textContent = o.msg;
    E.eb.innerHTML = (retry ? `<button type="button" class="cn-bt p" data-a="retry">${PI.retry}Tentar novamente</button>` : '')
      + (ext ? `<button type="button" class="cn-bt" data-a="ext">${PI.ext}Abrir fonte original</button>` : '')
      + '<button type="button" class="cn-bt' + (retry ? '' : ' p') + '" data-a="close">Fechar</button>';
    closeMenu(); root.classList.add('cn-show'); sync();
  };
  const loadSource = async (i, start, auto) => {
    cleanSrc();
    const g = ++W.gen, m = W.m;
    W.qi = i; W.err = null; W.loading = true; W.start = start || 0; W.levels = null; W.lvSel = -1; W.lvCur = -1;
    root.classList.remove('cn-bad', 'cn-slw');
    updQL(); sync();
    if (W.local) {
      let b;
      try { b = await Store.blob(m.id); } catch (e) { if (g === W.gen) fail({ title: 'Não foi possível abrir o arquivo guardado', msg: errMsg(e), retry: String(e && e.message) !== 'corrupt' }); return; }
      if (g !== W.gen || !W.open) return;
      if (!b) return fail({ title: 'Arquivo não encontrado neste aparelho', msg: 'O vídeo deste filme não está guardado aqui (ele pode ter sido importado em outro aparelho). Feche o player, abra o filme e use “Anexar arquivo”.', retry: false });
      W.obj = URL.createObjectURL(b); W.c = { k: 'file' };
      v.src = W.obj;
      if (auto !== false) tryPlay();
      return;
    }
    const s = W.srcs[i];
    if (!s) return fail({ title: 'Sem vídeo', msg: 'Este filme não tem arquivo nem link de vídeo. Edite o filme e importe o arquivo.', retry: false });
    const c = W.c = classify(s.u);
    if (c.k === 'invalid') return fail({ title: 'Link de vídeo inválido', msg: c.why, retry: false });
    if (c.mixed) return fail({ title: 'Conteúdo bloqueado pelo navegador', msg: MIXED, retry: false });
    W.h = attach(v, c, {
      start: W.start,
      levels: L => { W.levels = L; updQL(); if (W.menu === 'ql') renderMenu(); },
      level: x => { W.lvCur = x; if (W.menu === 'ql') renderMenu(); },
      fatal: k => fail(msgHls(k))
    });
    W.lt = setTimeout(() => {
      if (!W.open || W.err || v.readyState >= 1) return;
      fail({ title: 'O servidor demorou para responder', msg: 'O vídeo não começou a carregar em 25 segundos. O servidor pode estar lento ou fora do ar.' });
    }, 25000);
    if (auto !== false) tryPlay();
  };
  const onMeta = () => {
    clearTimeout(W.lt);
    const d = v.duration;
    if (W.start > 0 && isFinite(d) && !(W.h && W.h.hls)) { try { v.currentTime = Math.min(W.start, Math.max(0, d - 2)); } catch (e) {} }
    W.start = 0;
    if (v.paused) W.loading = false;
    const m = W.m;
    if (m && !m.dur && isFinite(d) && d > 0) { m.dur = Math.round(d / 60); m.u = Date.now(); persist(); bcast({ t: 'ci-b', m: [m] }); E.sub.textContent = metaLine(m); }
    updTime(); sync();
  };
  const onErr = () => {
    if (!W.open || W.cleaning || W.err || (W.h && W.h.hls) || !v.currentSrc) return;
    const code = v.error && v.error.code;
    if (W.local) return fail({ title: 'Não foi possível reproduzir este arquivo', msg: 'O arquivo foi encontrado, mas este navegador não consegue decodificá-lo (codec ou formato incompatível, ou arquivo corrompido). Converta para MP4 (H.264/AAC) ou WebM e importe de novo.', retry: false });
    fail(msgUrl(code, W.c));
  };
  const retry = () => { const t = W.lastT || 0; loadSource(W.qi, t, true); showCtl(); };

  const applyPrefs = () => {
    const p = getPref();
    v.volume = typeof p.vol === 'number' ? Math.min(1, Math.max(0, p.vol)) : 1;
    v.muted = !!p.muted;
    v.playbackRate = p.rate > 0 ? p.rate : 1;
    v.dispatchEvent(new Event('volumechange')); v.dispatchEvent(new Event('ratechange'));
  };
  const openPlayer = (m, start) => {
    ensureUI();
    if (W.open) closeNow(false);
    const srcs = m.url ? [{ l: m.ql || 'Padrão', u: m.url }].concat(Array.isArray(m.alts) ? m.alts.filter(a => a && a.u) : []) : [];
    Object.assign(W, { open: true, m, local: hasLocal(m.id) || !m.url, srcs, qi: 0, err: null, menu: '', start: 0, subMsg: [], blobs: [], lastSave: Date.now(), lastT: start || 0, hover: 0, drag: 0 });
    const c = cn();
    c.seen[m.id] = Date.now();
    persist();
    bcast({ t: 'ci-b', s: { [m.id]: c.seen[m.id] } });
    try { history.pushState({ p: 'cin', cv: st.v === 'det' ? 'd:' + st.id : '', w: 1 }, ''); W.pushed = true; } catch (e) { W.pushed = false; }
    E.ttl.textContent = m.title; E.sub.textContent = metaLine(m);
    E.mn.hidden = true;
    applyPrefs();
    root.classList.add('on', 'cn-show'); document.documentElement.classList.add('cn-lock');
    try { E.st.focus({ preventScroll: true }); } catch (e) {}
    loadSource(0, start, true);
    loadSubs(m);
    updTime(); sync(); showCtl();
  };
  const closeNow = rerender => {
    if (!W.open) return;
    saveProg();
    W.gen++;
    cleanSrc();
    v.querySelectorAll('track').forEach(t => t.remove());
    W.blobs.forEach(u => { try { URL.revokeObjectURL(u); } catch (e) {} }); W.blobs = [];
    closeMenu();
    if (fsEl()) { try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) {} }
    clearTimeout(W.ht); clearTimeout(W.tapT);
    root.classList.remove('on', 'cn-show', 'cn-bad', 'cn-load', 'cn-paused', 'cn-slw');
    document.documentElement.classList.remove('cn-lock');
    W.open = false; W.pushed = false; W.m = null; W.err = null;
    if (rerender && typeof page !== 'undefined' && page === 'cin') render();
  };
  const closePlayer = () => {
    if (!W.open) return;
    if (W.pushed) { try { history.back(); return; } catch (e) {} }
    closeNow(true);
  };

  /* ================= sincronização entre aparelhos pareados (mesmo canal do Hub, como a Música) =================
     Só trafegam METADADOS e progresso (nunca o vídeo). Mescla por data: vale a alteração mais recente de cada filme ('u'). */
  const syOk = () => typeof SY !== 'undefined' && SY._conns && SY._c;
  const openConns = () => syOk() ? Object.values(SY._conns()).filter(c => c.open && c.hid) : [];
  const sendJ = (c, o) => { try { c.send(JSON.stringify(o)); } catch (e) {} };
  const bcast = o => { try { openConns().forEach(c => sendJ(c, o)); } catch (e) {} };
  const SZ = 11000;
  const str = (x, n) => typeof x === 'string' ? x.trim().slice(0, n) : '';
  const num = x => Number.isFinite(+x) ? +x : 0;
  const okUrl = x => { x = str(x, 2000); return x && safeUrl(x) ? x : ''; };
  const cleanLines = a => Array.isArray(a) ? a.slice(0, 12).map(x => x && typeof x === 'object' ? { l: str(x.l, 40), u: okUrl(x.u) } : null).filter(x => x && x.u) : [];
  const cleanMovie = r => {
    if (!r || typeof r !== 'object' || !idOk(r.id)) return null;
    const o = { id: r.id, u: num(r.u), added: num(r.added) };
    if (r.del) { o.del = 1; return o; }
    o.title = str(r.title, 140);
    if (!o.title) return null;
    o.cover = okUrl(r.cover); o.synopsis = str(r.synopsis, 3000);
    o.year = Math.max(0, Math.min(2100, Math.round(num(r.year)))); o.dur = Math.max(0, Math.min(1500, Math.round(num(r.dur))));
    o.genres = Array.isArray(r.genres) ? r.genres.slice(0, 8).map(g => str(g, 40)).filter(Boolean) : [];
    o.url = okUrl(r.url); o.ql = str(r.ql, 20); o.alts = cleanLines(r.alts); o.subs = cleanLines(r.subs);
    o.feat = !!r.feat; o.rights = !!r.rights;
    o.fileName = str(r.fileName, 200); o.fileSize = Math.max(0, Math.round(num(r.fileSize))); o.fileType = str(r.fileType, 60); o.hasCover = !!r.hasCover;
    return o;
  };
  const mergeMovie = r => {
    const n = cleanMovie(r); if (!n) return false;
    const c = cn(), i = c.movies.findIndex(x => x && x.id === n.id);
    if (i < 0) { c.movies.push(n); if (n.del) purgeLocal(n.id); return true; }
    if (n.u > (c.movies[i].u || 0)) { c.movies[i] = n; if (n.del) purgeLocal(n.id); return true; }
    return false;
  };
  const mergeProg = (id, p) => {
    if (!p || typeof p !== 'object') return false;
    const n = { t: Math.max(0, num(p.t)), d: Math.max(0, num(p.d)), u: num(p.u), done: !!p.done }, c = cn();
    if (!c.prog[id] || n.u > (c.prog[id].u || 0)) { c.prog[id] = n; return true; }
    return false;
  };
  const mergeSeen = (id, ts) => { ts = num(ts); const c = cn(); if (ts > (c.seen[id] || 0)) { c.seen[id] = ts; return true; } return false; };
  const applyBatch = m => {
    let ch = false;
    (Array.isArray(m.m) ? m.m : []).slice(0, 300).forEach(x => { if (mergeMovie(x)) ch = true; });
    if (m.p && typeof m.p === 'object') Object.keys(m.p).slice(0, 300).forEach(id => { if (idOk(id) && mergeProg(id, m.p[id])) ch = true; });
    if (m.s && typeof m.s === 'object') Object.keys(m.s).slice(0, 300).forEach(id => { if (idOk(id) && mergeSeen(id, m.s[id])) ch = true; });
    return ch;
  };
  const packAll = () => {
    const c = cn(), out = []; let cur = [], len = 0;
    c.movies.forEach(m => {
      if (!m || !idOk(m.id)) return;
      const j = JSON.stringify(m);
      if (len + j.length > SZ && cur.length) { out.push({ t: 'ci-b', m: cur }); cur = []; len = 0; }
      cur.push(m); len += j.length + 1;
    });
    if (cur.length) out.push({ t: 'ci-b', m: cur });
    const chunk = (obj, key) => { const ks = Object.keys(obj); for (let i = 0; i < ks.length; i += 80) { const o = {}; ks.slice(i, i + 80).forEach(k => { o[k] = obj[k]; }); out.push({ t: 'ci-b', [key]: o }); } };
    chunk(c.prog, 'p'); chunk(c.seen, 's');
    return out;
  };
  const hello = c => packAll().forEach(b => sendJ(c, b));
  const onData = (c, d) => {
    if (typeof d !== 'string' || d[0] !== '{') return;
    let m; try { m = JSON.parse(d); } catch (e) { return; }
    if (!m || typeof m.t !== 'string' || m.t.slice(0, 3) !== 'ci-') return;
    if (!c._ih) { c._ih = 1; hello(c); }
    if (m.t === 'ci-b' && applyBatch(m)) { persist(); refreshUI(); }
  };
  const devName = id => { const l = (syOk() ? SY._c().links || [] : []).find(x => x.id == id); return l ? ((l.icon || '') + ' ' + l.name).trim() : 'Outro aparelho'; };
  const syLine = () => {
    const oc = openConns(), links = syOk() ? SY._c().links || [] : [];
    const note = ' Só os dados do filme e o progresso são enviados; os arquivos de vídeo ficam apenas no aparelho onde foram importados.';
    if (oc.length) return `⇄ Dados sincronizados com ${oc.map(c => esc(devName(c.hid))).join(', ')} <button type="button" class="cn-lk" onclick="CN.sync()">Sincronizar agora</button>.${note}`;
    return (links.length ? '⇄ Nenhum aparelho pareado está conectado agora; os dados do catálogo e o progresso sincronizam quando o outro abrir o ARCO.' : '⇄ Para levar o catálogo e o progresso a outro aparelho, pareie em Configurações → Conectar dispositivo.') + note;
  };
  const updSy = () => { const e = $('#cn-sy'); if (e) e.innerHTML = syLine(); };
  let syIds = '';
  const link = () => {
    if (!syOk()) return;
    try {
      const oc = openConns();
      oc.forEach(c => { if (!c._ci) { c._ci = 1; c.on('data', d => onData(c, d)); hello(c); } });
      const ids = oc.map(c => c.hid).sort().join(',');
      if (ids !== syIds) { syIds = ids; updSy(); }
    } catch (e) {}
  };
  CN.sync = () => {
    openConns().forEach(hello);
    const e = $('#cn-sy'); if (!e) return;
    e.textContent = '⇄ Enviado. Os aparelhos conectados trocaram os dados do catálogo.';
    setTimeout(updSy, 2500);
  };
  setInterval(link, 1000);
  initData();
  loadHas();

  /* ================= ligações globais ================= */
  addEventListener('beforeunload', e => { if (IMP.active) { e.preventDefault(); e.returnValue = ''; } });
  document.addEventListener('keydown', e => {
    if (!W.open || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key, onBtn = !!(e.target.closest && e.target.closest('button'));
    const act = f => { e.preventDefault(); showCtl(); f(); };
    if (k === 'Escape') { e.preventDefault(); if (W.menu) closeMenu(); else if (!fsEl()) closePlayer(); return; }
    if (k === ' ' || k === 'Spacebar') { if (onBtn) return; act(toggle); }
    else if (k === 'k' || k === 'K') act(toggle);
    else if (k === 'ArrowLeft' || k === 'ArrowRight') { if (e.target === E.vl) return; act(() => skip(k === 'ArrowLeft' ? -5 : 5)); }
    else if (k === 'j' || k === 'J') act(() => skip(-10));
    else if (k === 'l' || k === 'L') act(() => skip(10));
    else if (k === 'ArrowUp' || k === 'ArrowDown') { if (e.target === E.vl) return; act(() => { v.muted = false; v.volume = Math.min(1, Math.max(0, v.volume + (k === 'ArrowUp' ? 0.1 : -0.1))); }); }
    else if (k === 'm' || k === 'M') act(toggleMute);
    else if (k === 'f' || k === 'F') act(toggleFs);
    else if (k === 'c' || k === 'C') act(() => { const T = subTracks(); if (!T.length) return; const on = T.some(t => t.mode === 'showing'); setSub(on ? 'off' : '0'); });
    else if (/^[0-9]$/.test(k) && dur()) act(() => { v.currentTime = dur() * (+k) / 10; });
    else if (k === 'Home') act(() => { v.currentTime = 0; });
  });
  document.addEventListener('click', e => {
    const t = e.target;
    if (!t || !t.closest) return;
    if (W.open && t.closest('#nv')) { W.pushed = false; closeNow(false); }
    if (t.closest('[onclick*="go(\'cin\')"]')) { st.v = 'home'; st.id = null; }
    const gb = t.closest('[data-cng]');
    if (gb) { CN.g(gb.dataset.cng); return; }
    const go = t.closest('[data-cngo]');
    if (go) { st.g = go.dataset.cngo; st.q = ''; st.v = 'home'; st.id = null; render(); window.scrollTo(0, 0); }
  }, true);
  window.addEventListener('popstate', e => {
    const md = document.getElementById('md');
    if (md && md.className === 'on') return;
    const s = e.state || {};
    if (W.open && !s.w) { W.pushed = false; closeNow(false); }
    if (s.p === 'cin' && !s.w) {
      const mm = /^d:([\w-]+)$/.exec(s.cv || '');
      if (mm && mv(mm[1])) { st.v = 'det'; st.id = mm[1]; } else { st.v = 'home'; st.id = null; }
    }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && W.open) saveProg(); });
  window.addEventListener('pagehide', () => { if (W.open) saveProg(); });
})();