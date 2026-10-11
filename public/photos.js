/* Small, local-only portraits. Names and statistics never come from photo metadata. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CourtPhotos=api;})(typeof globalThis==='undefined'?this:globalThis,function(){
 'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function get(player,map){const x=map?.photos?.[player?.id];return x&&x.displayAllowed!==false&&x.playerId===player.id&&/^images\/players\/[a-z0-9_-]+\.(jpg|png|webp)$/.test(x.src||'')&&x.author&&x.license&&/^https:\/\/commons\.wikimedia\.org\//.test(x.sourcePage||'')?x:null;}
 function initials(p){const n=String(p?.enName||'').split(/[\s-]+/).filter(Boolean);return n.length?(n[0][0]+(n.length>1?n.at(-1)[0]:'')).toUpperCase():'?';}
 const focusedFrames={"nikola-bartunkova":{"sha":"3eb4c686c3d5b83c16db120400e91c231fb597a72fe9b60dc41a1a2b17dccd2a","box":[110,15,120,250,352]},"mirra-andreeva":{"sha":"5afbc07bd9aaca20894dde11ae4625e57ec2674dc5fedce5bfdba133be8bc1bd","box":[35,0,160,250,375]},"carlos-alcaraz":{"sha":"55a850c6289ef6a3e50a3406a6aee94eaa75c875d286f3216c008bd9d9ad6c67","box":[35,25,150,250,281]},"marat-safin":{"sha":"15db75217971f63f056e586d80416ace1631460ff6df7b94053c9aaa8e5033d3","box":[65,10,135,250,363]},"roger-federer":{"sha":"abe12dbce1c3bee4e4c0df31202d8a1c07690bca88415f1091aa4fafdd900cd0","box":[25,0,155,250,338]},"justine-henin":{"sha":"a4fd3056497038777691e192734e7d9c87beea4ef09027ca54153fd6c4d185f1","box":[75,0,170,250,295]},"daniil-medvedev":{"sha":"633d58b95530fa92de0d557cdaed2406b4a04d1d8197b3fe7036754bdb7d38cd","box":[40,20,180,250,334]},"jan-lennard-struff":{"sha":"0d6b382b95967147d6280823faeb7825d81c1bc0811f387bc56f8d415b0fec47","box":[15,0,185,250,375]}};
 function imageStyle(x){if(x?.selectionLocked)return 'object-fit:cover;object-position:'+(/^\d{1,3}% \d{1,3}%$/.test(x.objectPosition||'')?x.objectPosition:'50% 20%')+';';const f=focusedFrames[x?.playerId];if(f&&x.sha256===f.sha){const[a,b,size,w,h]=f.box;return `object-fit:fill;width:${w/size*100}%;height:${h/size*100}%;left:${-a/size*100}%;top:${-b/size*100}%;`;}return 'object-position:'+(/^\d{1,3}% \d{1,3}%$/.test(x?.objectPosition||'')?x.objectPosition:'50% 20%');}
 function avatar(player,cl='',map=globalThis.COURTSIDE_PHOTOS){const x=get(player,map);return '<span class="avatar photo-avatar '+esc(cl)+'" data-photo-player="'+esc(player?.id||'')+'" data-photo-name="'+esc(player?.name||player?.enName||'')+'" aria-hidden="true"><span class="photo-fallback">'+esc(initials(player))+'</span>'+(x?'<img src="'+esc(x.src)+'" alt="" width="72" height="72" loading="lazy" decoding="async" referrerpolicy="no-referrer" style="'+imageStyle(x)+'" title="'+esc(x.author+' · '+x.license)+'">':'')+'</span>';}
 function credit(player,map=globalThis.COURTSIDE_PHOTOS){const x=get(player,map);return x?'<p class="photo-credit"><a href="photo-credits.html#'+esc(player.id)+'" target="_blank" rel="noopener noreferrer">照片：'+esc(x.author)+' · '+esc(x.license)+'</a></p>':'';}
 if(typeof document!=='undefined')document.addEventListener('error',ev=>{const img=ev.target;if(img?.tagName==='IMG'&&img.parentElement?.classList.contains('photo-avatar')){img.remove();}},true);
 // Same-origin enlargement; no changes to match data or the surrounding layout.
 function previewPosition(rect,vw,vh,width=224,height=294){
  const margin=12,gap=12,w=Math.min(width,Math.max(1,vw-margin*2)),h=Math.min(height,Math.max(1,vh-margin*2));
  const clamp=(x,lo,hi)=>Math.max(lo,Math.min(x,Math.max(lo,hi)));
  let left=rect.right+gap,top=rect.top+(rect.height-h)/2,side='right';
  if(left+w>vw-margin){left=rect.left-w-gap;side='left';}
  if(left<margin){left=rect.left;top=rect.bottom+gap;side='below';if(top+h>vh-margin){top=rect.top-h-gap;side='above';}}
  return {left:clamp(left,margin,vw-w-margin),top:clamp(top,margin,vh-h-margin),width:w,height:h,side};
 }
 function focusPhoto(node){
  const direct=node?.closest?.('.photo-avatar');
  if(direct)return direct;
  return node?.matches?.('button,a[href],[role="button"]')?(node.querySelector?.('.photo-avatar')||null):null;
 }
 function initPreview(doc){
  const win=doc.defaultView;if(!win||doc.documentElement.dataset.photoPreviewBound)return;
  doc.documentElement.dataset.photoPreviewBound='true';
  let active=null,anchor=null,tip=null,showTimer=0,hideTimer=0,touch=false;
  const photoOf=node=>node?.closest?.('.photo-avatar')||null;
  function removeDescription(node){if(!node)return;const ids=(node.getAttribute('aria-describedby')||'').split(/\s+/).filter(x=>x&&x!=='court-photo-preview');if(ids.length)node.setAttribute('aria-describedby',ids.join(' '));else node.removeAttribute('aria-describedby');}
  function hide(){win.clearTimeout(showTimer);win.clearTimeout(hideTimer);removeDescription(active);active=null;anchor=null;if(tip)tip.hidden=true;}
  function closeSoon(){win.clearTimeout(showTimer);win.clearTimeout(hideTimer);hideTimer=win.setTimeout(hide,160);}
  function prepare(node){
   const list=[];if(node?.matches?.('.photo-avatar'))list.push(node);if(node?.querySelectorAll)list.push(...node.querySelectorAll('.photo-avatar'));
   for(const a of list){if(!a.querySelector('img'))continue;if(a.dataset.zoomReady)continue;a.dataset.zoomReady='true';a.removeAttribute('aria-hidden');a.setAttribute('role','img');a.setAttribute('aria-label',(a.dataset.photoName||'球员')+'照片');
    // Do not insert a second tab stop inside a name/card link.
    if(!a.parentElement?.closest('a[href],button,[role="button"]'))a.tabIndex=0;
   }
  }
  function show(a){
   if(!a?.isConnected||doc.hidden)return;const img=a.querySelector('img');if(!img||!img.complete||img.naturalWidth===0)return;
   hide();active=a;anchor=a;
   if(!tip){tip=doc.createElement('figure');tip.id='court-photo-preview';tip.className='photo-preview';tip.setAttribute('role','tooltip');tip.innerHTML='<div class="photo-preview-frame"><img alt="" decoding="async"></div><figcaption></figcaption>';tip.hidden=true;doc.body.append(tip);
    tip.addEventListener('pointerenter',()=>win.clearTimeout(hideTimer));tip.addEventListener('pointerleave',closeSoon);tip.querySelector('img').addEventListener('error',hide);
   }
   const name=a.dataset.photoName||'球员照片';const manifest=get({id:a.dataset.photoPlayer},win.COURTSIDE_PHOTOS);const large=manifest?.previewSrc;tip.querySelector('img').src=/^images\/players\/[a-z0-9_-]+\.(jpg|png|webp)$/.test(large||'')?new URL(large,doc.baseURI).href:(img.currentSrc||img.src);tip.querySelector('figcaption').textContent=name;
   const bounds=previewPosition(a.getBoundingClientRect(),win.innerWidth,win.innerHeight);
   Object.assign(tip.style,{left:bounds.left+'px',top:bounds.top+'px',width:bounds.width+'px',height:bounds.height+'px'});tip.dataset.side=bounds.side;tip.hidden=false;
   a.setAttribute('aria-describedby',((a.getAttribute('aria-describedby')||'')+' court-photo-preview').trim());
  }
  doc.addEventListener('pointerover',ev=>{
   if(ev.pointerType==='touch'||!win.matchMedia('(any-hover: hover)').matches)return;
   const a=photoOf(ev.target);if(!a?.querySelector('img')||a.contains(ev.relatedTarget))return;
   win.clearTimeout(hideTimer);win.clearTimeout(showTimer);showTimer=win.setTimeout(()=>show(a),140);
  });
  doc.addEventListener('pointerout',ev=>{const a=photoOf(ev.target);if(a&&!a.contains(ev.relatedTarget)){if(tip?.contains(ev.relatedTarget)){win.clearTimeout(showTimer);return;}closeSoon();}});
  doc.addEventListener('focusin',ev=>{if(touch)return;const a=focusPhoto(ev.target);if(a?.querySelector('img'))show(a);});
  doc.addEventListener('focusout',ev=>{const a=focusPhoto(ev.target);if(a===active)closeSoon();});
  doc.addEventListener('pointerdown',ev=>{touch=ev.pointerType==='touch';if(!tip?.contains(ev.target))hide();},true);
  doc.addEventListener('keydown',ev=>{touch=false;if(ev.key==='Escape'&&tip&&!tip.hidden){ev.preventDefault();ev.stopPropagation();hide();}},true);
  win.addEventListener('scroll',hide,true);win.addEventListener('resize',hide);doc.addEventListener('visibilitychange',()=>{if(doc.hidden)hide();});
  new win.MutationObserver(records=>{
   for(const r of records)for(const n of r.addedNodes)prepare(n);
   if(anchor&&(!anchor.isConnected||!anchor.querySelector('img')))hide();
  }).observe(doc.body,{childList:true,subtree:true});
  prepare(doc.body);
 }
 if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>initPreview(document),{once:true});
  else initPreview(document);
 }
 return {get,avatar,credit,initials,previewPosition,focusPhoto};
});
