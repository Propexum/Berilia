#!/bin/uv run python
import geopandas as gpd

gdf = gpd.read_file("../map/data/shapefiles/CONTOURS-IRIS_2-1_SHP_LAMB93_FXX-2020/iris_2020.geojson") # omg python is so slow

gdf.to_crs(epsg=3395, inplace=True)
# convert to euclidean CRS - tbh might be better to do this outside python because, as above, omg python is slow
# like, go make a cup of tea slow
# hehe y would u want to use more than one core on an embarrassingly parallel problem
# really should go back to julia - use Proj4 to convert and then meshes to calculate
gdf["area"] = gdf.geometry.area

# write CODE_IRIS, area csv
gdf[["CODE_IRIS", "area"]].to_csv("iris_area.csv")
