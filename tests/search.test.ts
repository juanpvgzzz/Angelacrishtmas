import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalSearch, normalizeSearch } from '../src/services/catalog-search.ts';
import type { Product, Category } from '../src/types/catalog.ts';
const categories = [
 {id:'flowers', name:'Flores eternas',slug:'flores-eternas',active:true,description:'Flores artesanales'},
 {id:'dolls',name:'Muñecas',slug:'munecas',active:true,section:'munecas-de-trapo',description:''},
 {id:'xmas',name:'Navidad',slug:'navidad',active:true,section:'navidad',description:''},
 {id:'hidden',name:'Oculta',slug:'oculta',active:false,description:''},
] as Category[];
const product=(id:string,name:string,categoryId:string,extras:Partial<Product>={}):Product=>({id,name,categoryId,slug:id,active:true,featured:true,description:'Hecho a mano',shortDescription:'',customizationOptions:[],images:[],availability:'under-order',basePrice:50000,priceFrom:false,order:0,productionTime:'',createdAt:'2026-09-01',...extras});
const products=[product('rose','Rosa de seda','flowers'),product('doll','Muñeca Lucía','dolls'),product('santa','Papá Noel','xmas',{customizable:true,customizationOptions:['Borgoña']}),product('hidden','Flor secreta','hidden'),product('inactive','Muñeca oculta','dolls',{active:false})];
const search=createLocalSearch(products,categories);
test('búsqueda parcial, tildes, puntuación, alias y errores pequeños',()=>{
 for(const [q,id] of [['flor','rose'],['mune','doll'],['arbol','santa'],['navidad','santa'],['regalo','santa'],['personalizado','santa'],['muneca','doll'],['MUÑECA!!!','doll'],['muenca','doll'],['borgona','santa']]) assert.ok(search.rank(q).some(hit=>hit.product.id===id),q);
 assert.equal(search.rank('zzzxsincoincidencias').length,0);
 assert.equal(normalizeSearch('ÁRBOL! / muñeca'),'arbol muneca');
});
test('prioridad: inicio de nombre, nombre, categoría, descripción',()=>{
 const records=[product('desc','Pieza artesanal','dolls',{description:'Rosa'}),product('cat','Pieza floral','flowers'),product('contains','Una rosa suave','dolls'),product('prefix','Rosa eterna','dolls')];
 const indexed=createLocalSearch(records,[...categories.filter(c=>c.id!=='flowers'),{...categories[0],name:'Rosa',slug:'rosa'}]);
 assert.deepEqual(indexed.rank('rosa').map(hit=>hit.product.id),['prefix','contains','cat','desc']);
});
test('no expone productos ni categorías ocultas, incluso en sugerencias iniciales',async()=>{
 for(const q of ['','flor','muneca','oculta','secreta']) assert.ok((await search.search(q)).every(hit=>!['hidden','inactive'].includes(hit.product.id)));
});
