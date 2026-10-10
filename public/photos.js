/* Small, local-only portraits. Names and statistics never come from photo metadata. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CourtPhotos=api;})(typeof globalThis==='undefined'?this:globalThis,function(){
 'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function get(player,map){const x=map?.photos?.[player?.id];return x&&x.playerId===player.id&&/^images\/players\/[a-z0-9_-]+\.(jpg|png|webp)$/.test(x.src||'')&&x.author&&x.license&&/^https:\/\/commons\.wikimedia\.org\//.test(x.sourcePage||'')?x:null;}
 function initials(p){const n=String(p?.enName||'').split(/[\s-]+/).filter(Boolean);return n.length?(n[0][0]+(n.length>1?n.at(-1)[0]:'')).toUpperCase():'?';}
 function avatar(player,cl='',map=globalThis.COURTSIDE_PHOTOS){const x=get(player,map),position=x&&/^\d{1,3}% \d{1,3}%$/.test(x.objectPosition||'')?x.objectPosition:'50% 20%';return '<span class="avatar photo-avatar '+esc(cl)+'" data-photo-player="'+esc(player?.id||'')+'" aria-hidden="true"><span class="photo-fallback">'+esc(initials(player))+'</span>'+(x?'<img src="'+esc(x.src)+'" alt="" width="72" height="72" loading="lazy" decoding="async" referrerpolicy="no-referrer" style="object-position:'+position+'" title="'+esc(x.author+' · '+x.license)+'">':'')+'</span>';}
 function credit(player,map=globalThis.COURTSIDE_PHOTOS){const x=get(player,map);return x?'<p class="photo-credit"><a href="photo-credits.html#'+esc(player.id)+'" target="_blank" rel="noopener noreferrer">照片：'+esc(x.author)+' · '+esc(x.license)+'</a></p>':'';}
 if(typeof document!=='undefined')document.addEventListener('error',ev=>{const img=ev.target;if(img?.tagName==='IMG'&&img.parentElement?.classList.contains('photo-avatar')){img.remove();}},true);
 return {get,avatar,credit,initials};
});
