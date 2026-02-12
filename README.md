# MiniCraft (GitHub Pages Ready)

This is a lightweight Minecraft-style browser game you can host directly from a GitHub repository.

## Features
- Procedural block world (grass/dirt/stone + trees)
- Move and jump (`WASD` / arrow keys / space)
- Break blocks (`Left Click`)
- Place blocks (`Right Click`)
- Hotbar/inventory (`1-5` to pick block type)

## Run locally
Because this is a static site, you can open `index.html` directly, or run a local server:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Host through GitHub
1. Create a GitHub repo and push these files.
2. In GitHub, open `Settings` -> `Pages`.
3. Under `Build and deployment`, set:
   - `Source`: `Deploy from a branch`
   - `Branch`: `main` (or your default) and `/ (root)`
4. Save, wait for deployment, then open the generated Pages URL.

## File structure
- `index.html` - app shell and canvas
- `style.css` - UI + responsive styling
- `main.js` - world generation, movement, and block interactions
