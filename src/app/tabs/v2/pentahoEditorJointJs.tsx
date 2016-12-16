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
import * as svgPanZoom from "svg-pan-zoom";
import * as styles from "../../styles/themes/current/base";
import * as onresize from "onresize";
import {Clipboard} from "../../components/clipboard";
import * as typeIcon from "../../components/typeIcon";
import * as gls from "../../base/gls";
import * as typestyle from "typestyle";
import {MarkDown} from "../../markdown/markdown";
require('../../styles/themes/current/draw2d/main.css');

import * as joint from "jointjs";
require('../../styles/jointjs.css');
//import * as _ from 'lodash';
require("../../utils/pentahoIcons");

// need a ts version, right now it is loaded in <script> tags in app.html
//require('../../../public/assets/pentaho/file.js');

declare const draw2d: any;
//declare var panzoom: any;
interface JQuery{
    panzoom():any;
}

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
                onKeyPress={this.handleKey} className="paperContainer" id="paperContainer">
               
                    <div id={this.state.uniqid} className="pentahograph" style={{height:3000,width:3000}}></div>

            </div>
        );
    }

    renderCanvas(canvasId, destroyAction = true) {

        let graph = new joint.dia.Graph;

        let paper = new joint.dia.Paper({
            el: $('#'+canvasId),
            width: 3000,
            height: 3000,
            model: graph,
            gridSize: 42
        });

        paper.drawGrid({color: "#88cf00",thickness: 1});
        //paper.setGridSize(42);

        let nodes = {};
        nodes["cells"] = this.state.data;
       //console.log(JSON.stringify(nodes,null,2))
        graph.fromJSON(JSON.parse(JSON.stringify(nodes,null,2)))
       //graph.fromJSON(JSON.parse(json))
        var clickPosX = null;
        var clickPosY = null;
        var movePosX = null;
        var movePosY = null;

        var oldPosX = null;
        var oldPosY = null;

        var dragging = false;

        var mapZoom = 1;

        var paperContainer = '#paperContainer';

        $('#'+canvasId).on('mousedown', function (e) {
            clickPosX = e.pageX;
            clickPosY = e.pageY;

            oldPosX = e.pageX;
            oldPosY = e.pageY;
            if (e.shiftKey){
                dragging = true;
            }
            //$('.draggingIndicator').html('yes');

            //console.log("click mousedown")

            e.originalEvent.preventDefault(); // prevents the browser from adding their own cursor
            //$(this).addClass('cursordrag'); // Adds the custom grabbing hand cursor
            
        }).on('mousemove', function (e) {
            movePosX = e.pageX;
            movePosY = e.pageY;

            if (dragging) {
                // this is not working :(
                $(paperContainer).scrollTop($(paperContainer).scrollTop() + (oldPosY - movePosY));
                $(paperContainer).scrollLeft($(paperContainer).scrollLeft() + (oldPosX - movePosX));

                oldPosX = movePosX;
                oldPosY = movePosY;
            }


        }).on('mouseup', function (e) {
            dragging = false;
            $(paperContainer).removeClass('cursordrag'); // Returns the cursor to default
        });
        

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
