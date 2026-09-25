# rytracetito.github.io

Site personnel de **TITO Amedée Rytrace** : statistique, processus stochastiques et fiabilité.
En ligne sur <https://rytracetito.github.io>.

Site statique (HTML, CSS, JavaScript), sans framework ni étape de compilation, hébergé par GitHub Pages.

## Structure

| Fichier | Rôle |
|---|---|
| `index.html` | Contenu de la page (textes FR, traductions EN dans `data-en`) |
| `style.css` | Mise en forme, thèmes sombre/clair, responsive |
| `script.js` | Langue, thème, menu mobile, animations, fond animé du hero |
| `lab.js` | Simulateur interactif (processus Gamma/Wiener, maintenance ARD₁, Monte-Carlo) |
| `404.html` | Page d'erreur |
| `cv.pdf` | CV téléchargeable |
| `assets/` | Favicon, image d'aperçu des partages (`og-image.jpg`), photo |

## Mettre à jour le contenu

- **Photo** : remplacer `assets/photo.webp` par une image carrée (environ 800 × 800 px). Si le fichier est absent, le monogramme « TR » s'affiche à la place.
- **CV** : remplacer `cv.pdf` en gardant le même nom.
- **Textes** : le français est écrit directement dans `index.html` ; la version anglaise est dans l'attribut `data-en` de la même balise (ou `data-en-html` si elle contient du HTML).

  ```html
  <h3 data-en="Degradation models">Modèles de dégradation</h3>
  ```

## Tester en local

```bash
python -m http.server 8000
```

Puis ouvrir <http://localhost:8000>.

## Publier

Chaque `git push` sur la branche `main` met le site à jour en une ou deux minutes.
