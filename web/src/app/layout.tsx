import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ExportAI - 一键导出 AI 对话',
  description: 'ExportAI 是一款 Chrome 扩展，支持多平台 AI 对话导出、8 种文件格式、图片内容保留和账号设置同步。',
};

const EXT_TOKEN_HANDLER = `
(function(){
  try{
    var p=new URLSearchParams(location.search);
    var at=p.get("ext_at");
    if(!at)return;
    localStorage.setItem("exportai_access_token",at);
    var rt=p.get("ext_rt");
    if(rt)localStorage.setItem("exportai_refresh_token",rt);
    var ui=p.get("ext_ui");
    if(ui){try{JSON.parse(ui);localStorage.setItem("exportai_user_info",ui)}catch(e){}}
    try{if(chrome&&chrome.storage&&chrome.storage.local){
      var obj={exportai_access_token:at};
      if(rt)obj.exportai_refresh_token=rt;
      if(ui)obj.exportai_user_info=ui;
      chrome.storage.local.set(obj);
    }}catch(e){}
    p.delete("ext_at");p.delete("ext_rt");p.delete("ext_ui");
    var s=p.toString(),h=location.hash||"";
    var clean=location.pathname+(s?"?"+s:"")+h;
    history.replaceState(null,"",clean);
    location.reload();
  }catch(e){}
})();
`.trim();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: EXT_TOKEN_HANDLER }} />
      </head>
      <body className="bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
