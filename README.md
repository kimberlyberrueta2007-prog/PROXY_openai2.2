DisenaArte_IA_v10 - Listo para GitHub
====================================

Descripción
-----------
Proyecto "DiseñaArte IA" versión preparada para subir a GitHub y desplegar en un host (Render, Vercel, Heroku, etc.).
Cliente estático (index.html + style.css + script.js) y un proxy Express (server.js) que reenvía peticiones a la API de OpenAI.

Archivos importantes
-------------------
- index.html: Interfaz de usuario (canvas + controles).
- style.css: Estilos originales.
- script.js: Código corregido y listo para usar (no cambia apariencia).
- server.js: Proxy Node/Express que usa la clave en variables de entorno.
- package.json: Dependencias y script `npm start`.
- .env: Archivo local para tu clave (NO subirlo a GitHub).
- .gitignore: Ignora `.env` y `node_modules`.

Cómo ejecutar localmente
------------------------
1. Clona o descomprime el proyecto en tu máquina.
2. Crea (o edita) el archivo `.env` en la raíz con tu clave de OpenAI:
   ```
   OPENAI_API_KEY=sk-XXXX
   PORT=3000
   ```
3. Instala dependencias:
   ```bash
   npm install
   ```
4. Inicia el servidor (proxy + estático):
   ```bash
   npm start
   ```
5. Abre en tu navegador: `http://localhost:3000` (o el puerto que indique tu entorno).

Notas de seguridad
------------------
- No subas tu `.env` a GitHub. En tu hosting configura `OPENAI_API_KEY` como variable de entorno/secret.
- El proxy está pensado para proyectos de desarrollo y despliegue sencillo. Para producción revisa límites, autenticación y uso de HTTPS.

Si quieres, puedo ayudarte a añadir ejemplos de prompts (rosas, rostro, manos) en la UI sin cambiar su diseño.