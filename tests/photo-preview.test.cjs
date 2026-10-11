const {test}=require('node:test');const assert=require('node:assert/strict');const P=require('../public/photos.js');
for(const [label,rect,vw,vh] of [
 ['left',{left:20,right:60,top:100,bottom:140,height:40},1440,900],
 ['right edge',{left:1350,right:1390,top:100,bottom:140,height:40},1440,900],
 ['bottom edge',{left:420,right:460,top:800,bottom:840,height:40},900,860],
 ['narrow',{left:220,right:250,top:12,bottom:42,height:30},360,640],
 ['short',{left:100,right:136,top:0,bottom:36,height:36},360,210],
 ['out of view',{left:100,right:136,top:-50,bottom:-14,height:36},360,640]
])test('portrait preview remains inside '+label,()=>{const p=P.previewPosition(rect,vw,vh);assert.ok(p.left>=12);assert.ok(p.top>=12);assert.ok(p.left+p.width<=vw-12);assert.ok(p.top+p.height<=vh-12);});
test('right-edge portrait opens on left',()=>assert.equal(P.previewPosition({left:1350,right:1390,top:100,bottom:140,height:40},1440,900).side,'left'));
test('preview name is escaped and no remote image is introduced',()=>{const p={id:'test',name:'<script>x</script>',enName:'Test Player'};const m={photos:{test:{playerId:'test',src:'images/players/test.jpg',author:'Author',license:'CC BY 4.0',sourcePage:'https://commons.wikimedia.org/wiki/File:Test.jpg'}}};const html=P.avatar(p,'',m);assert.ok(html.includes('data-photo-name="&lt;script&gt;x&lt;/script&gt;"'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('images/players/test.jpg'));});
