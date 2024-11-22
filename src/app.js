import {MapboxOverlay} from '@deck.gl/mapbox'
import {MVTLayer, TileLayer} from '@deck.gl/geo-layers'
import {BitmapLayer} from '@deck.gl/layers'
import {CSVLoader} from '@loaders.gl/csv'
import {load} from '@loaders.gl/core'
import '@finos/perspective-viewer/dist/css/pro.css'
import maplibregl from 'maplibre-gl'
import * as d3 from 'd3'
import * as observablehq from './vendor/observablehq' // from https://observablehq.com/@d3/color-legend

let STYLE = ""
if (window.location.hostname == 'localhost'){
    STYLE = "https://api.maptiler.com/maps/toner-v2/style.json?key=Y4leWPnhJFGnTFFk1cru"
} else if (window.location.hostname == 'o.blanthorn.com')  {
    STYLE = "https://api.maptiler.com/maps/toner-v2/style.json?key=L7Sd3jHa1AR1dtyLCTgq"
} else {
    STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json" // fall back to CARTO
}
const start_pos = {...{x: 1.43, y: 46.65, z: 6}, ...Object.fromEntries(new URLSearchParams(window.location.hash.slice(1)))}
const map = new maplibregl.Map({
    container: 'map',
    style: STYLE,
    center: [start_pos.x, start_pos.y],
    zoom: start_pos.z,
    minZoom: 5.5,
    bearing: 0,
    pitch: 0
})

const colourRamp = d3.scaleSequential(d3.interpolateSpectral).domain([0,1])

function mean(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length
}

function median(arr) {
    arr.sort((a, b) => a - b)
    const mid = Math.floor(arr.length / 2)
    if (arr.length % 2) return arr[mid]
    return (arr[mid - 1] + arr[mid]) / 2
}

/* convert from "rgba(r,g,b,a)" string to [r,g,b] */
const getColour = v => Object.values(d3.color(colourRamp(v))).slice(0,-1)
const getIrisData = csvmap => {
    return new MVTLayer({
    id: 'IrisLayer',
    minZoom: 6,
    maxZoom: 9,
    data: 'data/shapefiles/CONTOURS-IRIS_2-1_SHP_LAMB93_FXX-2020/tiles/{z}/{x}/{y}.pbf',
    extruded: false,
    stroked: true,
    getFillColor: d => {
        const codes = d.properties.CODE_IRIS.split(",")
        const vs = codes.map(x => csvmap.get(x))
        const v = median(vs)
        return v == undefined ? [255, 255, 255, 0] : getColour(v)
    },
    pickable: true
})}

function getTooltip({object}) {
    if (!object) return
    const toDivs = kv => {
        return `<div>${kv[0]}: ${typeof(kv[1]) == "number" ? parseFloat(kv[1].toPrecision(3)) : kv[1]}</div>` // parseFloat is a hack to bin scientific notation
    }
    const keyname = getParams().get('expression') ?? "percent_zero_voitures"
    const tooltip = doQuantiles ? 
        Object.entries({...object.properties, [keyname]: rawmap?.get(object.properties.CODE_IRIS), [keyname + "_quantile"]: csvmap?.get(object.properties.CODE_IRIS)}).map(toDivs).join(" ")
        : Object.entries({...object.properties, [keyname]: csvmap?.get(object.properties.CODE_IRIS)}).map(toDivs).join(" ")
    return {
        html: tooltip,
        style: {
            backgroundColor: '#fff',
            fontFamily: 'sans-serif',
            fontSize: '0.8em',
            padding: '0.5em',
            // fontColor: 'black',
        }
    }
}

const mapOverlay = new MapboxOverlay({
    interleaved: false,
    onClick: (info, event) => {
        if (info.layer) {
            console.log(info.object);
        }
    },
    getTooltip,
})

map.addControl(mapOverlay)
map.addControl(new maplibregl.NavigationControl())

const choochoo = new TileLayer({
    id: 'OpenRailwayMapLayer',
    data: 'https://tiles.openrailwaymap.org/maxspeed/{z}/{x}/{y}.png',
    maxZoom: 19,
    minZoom: 0,

    renderSubLayers: props => {
        const {boundingBox} = props.tile;

        return new BitmapLayer(props, {
            data: null,
            image: props.data,
            bounds: [boundingBox[0][0], boundingBox[0][1], boundingBox[1][0], boundingBox[1][1]]
        })
    },
    pickable: false
})

let csvmap = new Map()
let rawmap = new Map()
window.csvmap = csvmap
const getParams = () => new URLSearchParams(window.location.search)
// event listener to url change to keep params updated

window.d3 = d3
window.observablehq = observablehq
const doQuantiles = getParams().get('quantiles') != null
async function hardMode() {
    // delete button if it's there
    document.getElementById("loadviewer")?.remove()
    const perspective = await import('@finos/perspective')
    await import('@finos/perspective-viewer')
    await import('@finos/perspective-viewer-datagrid')
    await import('@finos/perspective-viewer-d3fc')

    const viewer = document.createElement("perspective-viewer")
    document.getElementById("settings").appendChild(viewer)
    window.viewer = viewer
    perspective.worker().then(async (worker) => {
        window.w = worker
        const arrow = (getParams().get('bigdata') !== null) ? await fetch("data/big.arrow") : await fetch("data/base-ic-logement-2020.arrow")
        const arrowData = await arrow.arrayBuffer()
        const table = await w.table(arrowData)
        window.table = table
        viewer.load(table)
        viewer.restore({settings:true, expressions: {chloropleth: getParams().get('expression') ?? '1 - ("P20_RP_VOIT1P" / "P20_RP")'}})

        perspectiveUpdate()
        viewer.addEventListener("perspective-config-update", x=> {
            if (x?.detail?.expressions?.chloropleth != prevExpression) {
                // update search param
                const url = new URL(window.location)
                url.searchParams.set('expression', x?.detail?.expressions?.chloropleth)
                history.replaceState({}, "", url.toString())
                prevExpression = x?.detail?.expressions?.chloropleth
                perspectiveUpdate()
            }
        })
    })
}

async function perspectiveUpdate(){
    mapOverlay.setProps({layers: []}) // force a refresh
    const expression = (await grabExpressions())?.chloropleth ?? getParams().get('expression') ?? '1 - ("P20_RP_VOIT1P" / "P20_RP")' // technically unreachable but osef
    const view = await table.view({
        columns: ["IRIS", "value"],
        expressions: {'value' : expression}
    })
    const cols = await view.to_columns()
    view.delete()

    const valuekey = doQuantiles ? "quantile" : "value"
    if (doQuantiles) {
        const [getquantile, getvalue] = ecdf(cols.value)
        const quantiles = cols.value.map(getquantile)
        makeLegend(getvalue)
        csvmap = new Map(lazyZip(cols.IRIS, quantiles))
        rawmap = new Map(lazyZip(cols.IRIS, cols.value))
    } else {
        makeLegend()
        csvmap = new Map(lazyZip(cols.IRIS, cols.value))
    }

    const layers = [getIrisData(csvmap)]
    if (getParams().get('trains') !== null){
        layers.push(choochoo)
    }
    mapOverlay.setProps({layers})
}
window.perspectiveUpdate = perspectiveUpdate
// // will need to add a check for changes on this
// x.detail.expressions
// // can't just reload every time or it'll get slow
let prevExpression = null

const l = document.getElementById("attribution")
l.innerText = "© " + ["INSEE", "MapTiler",  "OpenStreetMap contributors", getParams().get('trains') !== null ? "OpenRailwayMap" : null].filter(x=>x !== null).join(" © ")
const legendDiv = document.createElement('div')
legendDiv.id = "observable_legend"
l.insertBefore(legendDiv, l.firstChild)

if (getParams().get('expression') === null ) {
    const csvdata = (await load("data/iris_data.csv", CSVLoader, {csv: {header: true, dynamicTyping: false}})).data
    csvmap = new Map(csvdata.map(r => [r.IRIS, r.perc_voit]))
    const layers = [getIrisData(csvmap)]
    if (getParams().get('trains') !== null){
        layers.push(choochoo)
    }
    mapOverlay.setProps({layers})
    makeLegend()
} else {
    hardMode()
}

function* lazyZip(a, b){
    if (a.length != b.length) throw new Error("unequal lengths")
    for (let i = 0; i < a.length; i++) {
        yield [a[i], b[i]]
    }
}
window.lazyZip = lazyZip

async function makeLegend(fmt) {
    if (fmt !== undefined) {
        const legend = observablehq.legend({color: colourRamp, title: getParams().get('t') ?? getParams().get('expression') ?? "Fraction of principal residences with zero cars", tickFormat: v => parseFloat(fmt(v).toPrecision(3))})
        legendDiv.innerHTML = ""
        legendDiv.insertBefore(legend, legendDiv.firstChild)
    } else {
        const legend = observablehq.legend({color: colourRamp, title: getParams().get('t') ?? getParams().get('expression') ?? "Fraction of principal residences with zero cars"})
        legendDiv.innerHTML = ""
        legendDiv.insertBefore(legend, legendDiv.firstChild)
    }
}

map.on('moveend', () => {
    const pos = map.getCenter()
    const z = map.getZoom()
    window.location.hash = `x=${pos.lng.toFixed(2)}&y=${pos.lat.toFixed(2)}&z=${z.toFixed(2)}`
})


function ecdf(array){
    const mini_array = Array.from({length: Math.min(8192, array.length)}, () => Math.floor(Math.random()*array.length)).map(i => array[i]).sort((l,r) => l-r).filter(v => v != null) // sort() sorts alphabetically otherwise
    const quantile = mini_array.map((v, position) => position + 1).map(v => v/mini_array.length) // +=v to weight by number rather than position
    function getvalue(target) {
        target = Math.min(Math.max(0.01,target),0.99) // ignore top/bottom 1% because they're usually stupid
        const v = mini_array[quantile.findIndex(v => v >= target)]
        return v ?? mini_array[0]
    }
    return [target => quantile[mini_array.findIndex(v => v > target)] ?? 1, getvalue] // function to get quantile from value and value from quantile, with fudging to exclude top/bottom 1% from legend
}

async function grabExpressions(){
    return (await viewer.save())?.expressions
}

// add click event listener to loadviewer button
document.getElementById("loadviewer").addEventListener("click", () => {
    hardMode()
})

window.grabExpressions = grabExpressions
