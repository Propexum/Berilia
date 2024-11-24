#!/bin/julia
using GeoJSON, Meshes, CoordRefSystems, Missings

gj = GeoJSON.read("../map/data/shapefiles/CONTOURS-IRIS_2-1_SHP_LAMB93_FXX-2020/iris_2020.geojson")

p2LatLon(p) = LatLon(p[2], p[1])
stripunits(p) = (p.x.val, p.y.val)

poly2xylist(poly) = Mercator[p2LatLon.(poly)...] .|> stripunits

# need to deal with multipolygons vs not
polyholes2polyarea(polyholes::GeoJSON.Polygon) = PolyArea(poly2xylist.(polyholes)...)
polyholes2polyarea(polyholes) = missing

map(passmissing(area),polyholes2polyarea.(gj.geometry))

# in the time it took to write this code the python process finished
