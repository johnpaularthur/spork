import * as ui from "../../ui";
import * as csx from "../../base/csx";
import * as React from "react";
import * as tab from "./tab";
import {server, cast} from "../../../socket/socketClient";
import * as commands from "../../commands/commands";
import * as utils from "../../../common/utils";
import * as d3 from "d3";
import {Types} from "../../../socket/socketContract";
import * as types from "../../../common/types";
import {IconType} from "../../../common/types";
import * as $ from "jquery";
import * as styles from "../../styles/themes/current/base";
import * as onresize from "onresize";
import {Clipboard} from "../../components/clipboard";
import * as typeIcon from "../../components/typeIcon";
import * as gls from "../../base/gls";
import * as typestyle from "typestyle";
import {MarkDown} from "../../markdown/markdown";
require('../../styles/themes/current/draw2d/main.css');

import * as joint from "jointjs";


// need a ts version, right now it is loaded in <script> tags in app.html
//require('../../../public/assets/pentaho/file.js');

declare const draw2d: any;

const {blackHighlightColor} = styles;

export interface Props extends tab.TabProps {
}

export interface State {
    filter?: string;
    classes?: types.UMLClass[];
    selected?: types.UMLClass;
    uniqid?: string;
    data?: string;
    canvas?: Object;
}

export namespace PentahoEditorStyles {
    export const classNameHeaderSection = typestyle.style({
        border: '1px solid grey',
        padding: '5px',

        /** A nice clickable look */
        cursor: 'pointer',
        '&:hover': {
            textDecoration: 'underline'
        }
    });

    export const classMemberSection = typestyle.style({
        // Common with header
        border: '1px solid grey',
        padding: '5px',
        cursor: 'pointer',
        '&:hover': {
            textDecoration: 'underline'
        },

        // To eat top border
        marginTop: '-1px'
    });
}

export class PentahoEditor extends ui.BaseComponent<Props, State> {



    constructor(props: Props) {
        super(props);

        var randLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        var uniqid = randLetter + Date.now();
        this.filePath = utils.getFilePathFromUrl(props.url);
        this.state = {
            filter: '',
            classes: [],
            selected: null,
            uniqid: uniqid
        };

    }

    refs: {
        [string: string]: any;
        root: HTMLDivElement;
        graphRoot: HTMLDivElement;
        controlRoot: HTMLDivElement;
    }

    filePath: string;

    componentDidMount() {

        /**
         * Initial load + load on project change
         */
        this.loadData(false);
        this.disposible.add(
            cast.activeProjectFilePathsUpdated.on(() => {
                this.loadData();
            })
        );

        /**
         * If a file is selected and it gets edited, reload the file module information
         */
        const loadDataDebounced = utils.debounce(this.loadData, 3000);
        this.disposible.add(
            commands.fileContentsChanged.on((res) => {
                if (this.filePath !== res.filePath) return;
                loadDataDebounced();
            })
        );



        /**
         * Handle focus to inform tab container
         */
        const focused = () => {
            this.props.onFocused();
        }
        this.refs.root.addEventListener('focus', focused);
        this.disposible.add({
            dispose: () => {
                this.refs.root.removeEventListener('focus', focused);
            }
        })

        // Listen to tab events
        const api = this.props.api;
        this.disposible.add(api.resize.on(this.resize));
        this.disposible.add(api.focus.on(this.focus));
        this.disposible.add(api.save.on(this.save));
        this.disposible.add(api.close.on(this.close));
        this.disposible.add(api.gotoPosition.on(this.gotoPosition));
        // Listen to search tab events
        this.disposible.add(api.search.doSearch.on(this.search.doSearch));
        this.disposible.add(api.search.hideSearch.on(this.search.hideSearch));
        this.disposible.add(api.search.findNext.on(this.search.findNext));
        this.disposible.add(api.search.findPrevious.on(this.search.findPrevious));
        this.disposible.add(api.search.replaceNext.on(this.search.replaceNext));
        this.disposible.add(api.search.replacePrevious.on(this.search.replacePrevious));
        this.disposible.add(api.search.replaceAll.on(this.search.replaceAll));
    }

    render() {

        return (
            <div
                ref="root"
                tabIndex={0}
                style={csx.extend(csx.vertical, csx.flex, csx.newLayerParent, styles.someChildWillScroll, {color: styles.primaryTextColor}) }
                onKeyPress={this.handleKey}>
                <div style={{position: "absolute", overflow: "scroll", height:"inherit",width:"inherit"}}>
                    <div id={this.state.uniqid} className="Draw2dGraph" style={{height:3000,width:3000}}></div>
                </div>
            </div>
        );
    }

    renderCanvas(canvasId, destroyAction = true) {

        let svgFileContent =
        `
        <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
                width="42px" height="42px" viewBox="0 0 42 42" enable-background="new 0 0 42 42" xml:space="preserve">
        <g>
                <path fill="#EFF9FE" d="M21.82,5.567c-5.882,0-10.773,4.897-10.905,10.915l-0.018,0.573l-2.54,6.025
                        c-0.055,0.125-0.083,0.292-0.052,0.357c0.014,0.028,0.067,0.069,0.161,0.107h2.436v4.343c0.002,0.107,0.083,2.772,3.472,3.73h4.844
                        v4.234h8.91V25.539l0.362-0.244c1.959-1.32,4.247-4.355,4.247-8.562C32.737,10.576,27.84,5.567,21.82,5.567z M13.953,19.177
                        c-0.8,0-1.449-0.649-1.449-1.449c0-0.8,0.649-1.449,1.449-1.449c0.801,0,1.449,0.649,1.449,1.449
                        C15.402,18.528,14.753,19.177,13.953,19.177z M23.761,21.945c-4.002,0-7.247-3.244-7.247-7.247c0-4.002,3.245-7.247,7.247-7.247
                        s7.247,3.245,7.247,7.247C31.007,18.701,27.763,21.945,23.761,21.945z"/>
                <path fill="#3D6480" d="M21.82,3.924c-6.768,0-12.396,5.618-12.547,12.514l-0.008,0.261L6.86,22.406
                        c-0.043,0.09-0.411,0.899-0.057,1.697c0.156,0.35,0.506,0.817,1.293,1.051l1.163,0.034v2.7c0,1.405,1.001,4.331,4.792,5.345
                        l3.524,0.028v4.235h12.196V26.398c2.203-1.66,4.609-5.067,4.609-9.665C34.38,9.67,28.746,3.924,21.82,3.924z M28.491,25.295
                        l-0.362,0.244v10.314h-8.91v-4.234h-4.844c-3.389-0.958-3.47-3.623-3.472-3.73v-4.343H8.466c-0.094-0.038-0.147-0.079-0.161-0.107
                        c-0.03-0.065-0.003-0.232,0.052-0.357l2.54-6.025l0.018-0.573c0.131-6.018,5.023-10.915,10.905-10.915
                        c6.02,0,10.917,5.009,10.917,11.167C32.737,20.939,30.45,23.975,28.491,25.295z"/>
                <circle fill="#3D6480" cx="13.953" cy="17.728" r="1.449"/>
                <path fill="#FFFFFF" d="M23.392,19.72v-4.652h-4.653C18.923,17.558,20.901,19.536,23.392,19.72z"/>
                <path fill="#FFFFFF" d="M23.761,7.452c-4.002,0-7.247,3.245-7.247,7.247c0,4.002,3.245,7.247,7.247,7.247s7.247-3.244,7.247-7.247
                        C31.007,10.697,27.763,7.452,23.761,7.452z M29.538,15.068c-0.184,2.901-2.507,5.224-5.409,5.409v0.983h-0.738v-0.983
                        c-2.902-0.184-5.225-2.507-5.409-5.409H17V14.33h0.983c0.184-2.902,2.507-5.226,5.409-5.41V7.939h0.738v0.982
                        c2.902,0.184,5.225,2.508,5.409,5.41h0.983v0.738H29.538z"/>
                <path fill="#FFFFFF" d="M24.13,9.678v4.653h4.652C28.598,11.839,26.62,9.861,24.13,9.678z"/>
                <path fill="#3D6480" d="M29.538,14.33c-0.184-2.902-2.507-5.225-5.409-5.41V7.939h-0.738v0.982
                        c-2.902,0.184-5.225,2.508-5.409,5.41H17v0.738h0.983c0.184,2.901,2.507,5.225,5.409,5.409v0.983h0.738v-0.983
                        c2.901-0.184,5.224-2.507,5.409-5.409h0.983V14.33H29.538z M23.392,19.72c-2.491-0.184-4.469-2.162-4.653-4.652h4.653V19.72z
                        M24.13,14.33V9.678c2.49,0.184,4.468,2.162,4.652,4.653H24.13z"/>
        </g>
        </svg>
        `

        var jsonString = `{
	"cells": [{
		"type": "pentaho.dummy",
		"position": {
			"x": 100,
			"y": 100
		},
		"id": "33565d8a-7aab-44bf-bf92-0a484f36e509",
		"z": 0,
		"attrs": {}
	}]
}`
      
        joint.shapes.pentaho = {}
        joint.shapes.pentaho.dummy = new joint.shapes.basic.Image({
        size: {
            width: 42,
            height: 42
        },
        position: {
            x: 100,
            y: 100
        },
        attrs: {
            image: {
            width: 42,
            height: 42,
            'xlink:href': 'data:image/svg+xml;utf8,' + encodeURIComponent(svgFileContent),
            preserveAspectRatio: 'none'
            }
        }
        });

        let shape = joint.shapes.pentaho.dummy;

        let graph = new joint.dia.Graph;

        

        let paper = new joint.dia.Paper({
            el: $('#'+canvasId),

            model: graph,
            gridSize: 1
        });

        graph.fromJSON(JSON.parse(jsonString))

        // let rect = new joint.shapes.basic.Rect({
        //     position: { x: 100, y: 30 },
        //     size: { width: 100, height: 30 },
        //     attrs: { rect: { fill: 'blue' }, text: { text: 'my box', fill: 'white' } }
        // });

        // let rect2 = shape.clone();
        // rect2.translate(300);

        // let link = new joint.dia.Link({
        //     source: { id: shape.id },
        //     target: { id: rect2.id }
        // });

        // graph.addCells([shape, rect2, link]);

        console.log(JSON.stringify(graph))
      
  };


    handleKey = (e: any) => {
        let unicode = e.charCode;
        if (String.fromCharCode(unicode).toLowerCase() === "r") {
            this.loadData(true);
        }
    }

    filter = () => {
        // TODO:
    }

    loadData = (destroyAction = true) => {
        server.getJsonForFile({filePath: this.filePath}).then(res => {
            // // Preserve selected
            // let selected = this.state.selected && res.classes.find(c => c.name === this.state.selected.name);
            // // otherwise auto select first
            // if (!selected && res.classes.length) {
            //     selected = res.classes[0];
            // }
            // this.setState({ classes: res.classes, selected });
            // this.filter();
            //console.log(res);
            this.setState({data: res})
            //console.log("state set", res);
            this.renderCanvas(this.state.uniqid,destroyAction);
        })
    }

    /**
     * TAB implementation
     */
    resize = () => {
        // Not needed
    }

    focus = () => {
        this.refs.root.focus();
    }

    save = () => {
    }

    close = () => {
    }

    gotoPosition = (position: EditorPosition) => {
    }

    search = {
        doSearch: (options: FindOptions) => {
            this.setState({ filter: options.query });
        },

        hideSearch: () => {
            this.setState({ filter: '' });
        },

        findNext: (options: FindOptions) => {
        },

        findPrevious: (options: FindOptions) => {
        },

        replaceNext: ({newText}: { newText: string }) => {
        },

        replacePrevious: ({newText}: { newText: string }) => {
        },

        replaceAll: ({newText}: { newText: string }) => {
        }
    }
}
