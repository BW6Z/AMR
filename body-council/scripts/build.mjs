import {ROLES} from '../worker/game.js';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
mkdirSync('dist/server',{recursive:true});
const html=readFileSync('web/index.html','utf8').replace('__ROLE_CATALOG__',JSON.stringify(ROLES));
const engine=readFileSync('worker/game.js','utf8');
const server=readFileSync('worker/index.js','utf8').replace("import {createRoom,joinRoom,operate,view,upgradeRoom} from './game.js';",'');
writeFileSync('dist/server/index.js',engine+'\nconst HTML='+JSON.stringify(html)+';\n'+server);
console.log('Built browser UI and game server.');
