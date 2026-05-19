# Connectivitat de centres

Aplicació web estàtica per carregar un CSV de connectivitat de centres educatius i consultar les dades per codi de centre, nom de centre o municipi.

## Ús

Obre `index.html` o serveix la carpeta amb un servidor local:

```bash
python3 -m http.server 8000
```

Després accedeix a `http://localhost:8000`.

## GitHub Pages

El projecte està preparat per desplegar-se amb GitHub Pages des de la branca `main`.

URL prevista:

```text
https://rbarrachina.github.io/connectivitat_centres/
```

## Enllaços

La cerca queda reflectida a l'URL amb el paràmetre `q`. Per exemple:

```text
http://localhost:8000/?q=Girona
https://rbarrachina.github.io/connectivitat_centres/?q=Girona
```

Com que el CSV es carrega localment al navegador, l'enllaç conserva la cerca però no pot incloure les dades del fitxer.

## Llicencies i fonts

- La informació ampliada de la fitxa de centre segueix el criteri del projecte `rbarrachina/fitxa-centres-educatius`: `https://github.com/rbarrachina/fitxa-centres-educatius`.
- Les dades públiques de centre es consulten al dataset `kvmv-ahh4` de Transparència Catalunya.
- Aquesta aplicació no envia el CSV a cap servidor; el fitxer es parseja al navegador.

## Autor

Rafa Barrachina

## Llicència

GNU AGPL-3.0.
