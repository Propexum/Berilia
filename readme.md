# French IRIS tiled map

[View live here!](https://o.blanthorn.com/france-iris/map/#x=4.844466734284424&y=45.75895982567425&z=13.537551815531074)

[or click here to view with railways superimposed](https://o.blanthorn.com/france-iris/map/?trains#x=4.844466734284424&y=45.75895982567425&z=13.537551815531074)

A simple data vis tool using MapLibre GL and deck.gl to display data from a CSV or Arrow file joined with the French INSEE IRIS divisions of communes (approx ~3,000 people per area)

<p align="center">
<img src="promo/demo.png" alt="Chloropleth map of Paris showing percentage of principal residences without cars">
</p>

# Usage

<!-- ![demo video](promo/iris-column.mp4) -->

https://github.com/user-attachments/assets/794f2fec-f772-401d-a7b9-984b556a7047

You can use the stupidly powerful [Perspective dialect of ExprTK](https://docs.rs/perspective-client/3.1.6/perspective_client/config/expressions/) to query the data and plot on the map. You can only display one column. If you don't want to normalise it between 0 and 1, supply the `quantiles` search param in the URL.

The data provided is the base-logement-2020 dataset from INSEE - you'll want to view the dictionary of variables here https://www.insee.fr/fr/statistiques/7704078#dictionnaire (French :( )

I converted that dataset to Arrow using Julia but anything would work. Probably.

If anyone knows of a dataset with the IRIS areas computed in square kilometres (or furlongs, whatever), please let me know because I'd love to add it to the table. If I can't find one within a few months and I still have the motivation, I'll compute it myself, but I'd rather not.

## Examples

- rule of thumb is 'everything you would expect to work will work but you gotta stick column names in double quotes'

- well everything except `+` for reasons i am too lazy to investigate and presumably a dozen other things. for + just use `--` instead ;)

- you can (obviously?) just display a single column from https://www.insee.fr/fr/statistiques/7704078#dictionnaire if you want

- provide the `t=your legend title goes here` searchparam if you want to take a nice screenie

```md

- percentage of households with 2+ cars
"P20_RP_VOIT2P/"P20_RP"
https://o.blanthorn.com/france-iris/map/?expression="P20_RP_VOIT2P/"P20_RP"#x=0.33&y=47.35&z=6.83


- households with 2+ cars scaled by quantiles
https://o.blanthorn.com/france-iris/map/?quantiles&expression="P20_RP_VOIT2P"/"P20_RP"#x=0.33&y=47.35&z=6.83


- absolute number of second homes
"P20_RSECOCC"
https://o.blanthorn.com/france-iris/map/?quantiles&expression="P20_RSECOCC"#x=1.99&y=46.42&z=6.17


- percentage of dwellings that are second homes scaled by quantiles
"P20_RSECOCC"/"P20_LOG"
https://o.blanthorn.com/france-iris/map/?quantiles&expression="P20_RSECOCC"/"P20_LOG"#x=1.99&y=46.42&z=6.17


- approx number of cars per capita (capped at 2 per household, principal residence in numerator, total population(?) denominator)
- NB the -- trick to get +
https://o.blanthorn.com/france-iris/map/?quantiles&expression=(2*%22P20_RP_VOIT2P%22--%22P20_RP_VOIT1%22)/%22P20_PMEN%22#x=3.36&y=46.05&z=6.21

- approx average residence construction date
avg(
    1900*"P20_RP_ACH19" --
    1932*"P20_RP_ACH45" --
    1958*"P20_RP_ACH70" --
    1980*"P20_RP_ACH90" --
    1997*"P20_RP_ACH05" --
    2010*"P20_RP_ACH17" --
    2019*("P20_RP" - "P20_RP_ACHTOT")
) / "P20_RP"

https://o.blanthorn.com/france-iris/map/?quantiles&expression=avg(%201900*%22P20_RP_ACH19%22%20--%201932*%22P20_RP_ACH45%22%20--%201958*%22P20_RP_ACH70%22%20--%201980*%22P20_RP_ACH90%22%20--%201997*%22P20_RP_ACH05%22%20--%202010*%22P20_RP_ACH17%22%20--%202019*(%22P20_RP%22%20-%20%22P20_RP_ACHTOT%22)%20)%20/%20%22P20_RP%22#x=4.93&y=45.74&z=11.61
```

# Development

## How to run

Prerequisites: yarn. A web browser. A CSV file of IRIS code, value.

0. `git clone`
1. `yarn install`
2. bung data in `./www/data/iris_data.csv` with numeric IRIS code, values normalised from 0-1
3. `yarn serve&; yarn watch`, open localhost:1983
4. reload page to reload data

(nb: at the moment the value column is called perc_voit and the tooltip hardcodes it as percent_zero_voitures)


## Dealing with France

IRIS contour shapefiles come from https://geoservices.ign.fr/contoursiris and then need some wrangling

convert lambert 93 (or other) shapefile with wgs84 geojson then make tiles
```
ogr2ogr -f GeoJSON -t_srs EPSG:4326 iris_2020.geojson CONTOURS-IRIS.shp 
tippecanoe -Z6 -zg --no-tile-size-limit --coalesce-smallest-as-needed --no-tile-compression -ECODE_IRIS :comma -e tiles iris_2020.geojson # pay attention to min/max zoom in tiles directory and set to right value in deck.gl
```

## Deployment

```
yarn run build
git add www/
git push
# wait a bit
```

## Get more data

https://www.insee.fr/fr/statistiques?geo=IRIS-1

Just make sure you have IRIS tiles that correspond to the data you're using

# Copyright
IRIS tiles copyright INSEE and IGN
