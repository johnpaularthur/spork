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

// need a ts version, right now it is loaded in <script> tags in app.html
//require('../../../public/assets/pentaho/file.js');

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

      draw2d.shape.basic.Label.inject( {
          clearCache:function() {
                  this.portRelayoutRequired=true;
                  this.cachedMinWidth  = null;
                  this.cachedMinHeight = null;
                  this.cachedWidth=null;
                  this.cachedHeight=null;
                  this.lastAppliedTextAttributes= {};
                  return this;
              }
        });

        let canvas = new draw2d.Canvas(canvasId);
      // unmarshal the JSON document into the canvas
      // (load)

        var reader = new draw2d.io.json.Reader();
        reader.unmarshal(canvas, this.state.data);




        canvas.grid =  new draw2d.policy.canvas.ShowGridEditPolicy(20);

        canvas.setScrollArea(canvas.getHtmlContainer());

        canvas.installEditPolicy( canvas.grid);
        canvas.installEditPolicy( new draw2d.policy.canvas.FadeoutDecorationPolicy());
        canvas.installEditPolicy( new draw2d.policy.canvas.SnapToGridEditPolicy());
        canvas.installEditPolicy( new draw2d.policy.canvas.SnapToGeometryEditPolicy());
        canvas.installEditPolicy( new draw2d.policy.canvas.SnapToCenterEditPolicy());
        canvas.installEditPolicy( new draw2d.policy.canvas.SnapToInBetweenEditPolicy());
        //canvas.installEditPolicy( new draw2d.layout.anchor.ChopboxConnectionAnchor());

        var zoom=new draw2d.policy.canvas.WheelZoomPolicy();
        canvas.installEditPolicy(zoom);
        //canvas.setScrollArea("canvas")
        //canvas.installEditPolicy(new draw2d.policy.canvas.PanningSelectionPolicy());
        //canvas.installEditPolicy(new draw2d.policy.canvas.WheelZoomPolicy());


        canvas.getFigures().each(function(i,f){
            f.getPorts().each(function(i,port){
                port.setConnectionAnchor(new draw2d.layout.anchor.ChopboxConnectionAnchor(port));
            });
        })


        // display the JSON text in the preview DIV
        //
        //displayJSON(canvas);
        //});

      // add an event listener to the Canvas for change notifications.
      // We just dump the current canvas document as simple text into
      // the DIV
      //
      // canvas.getCommandStack().addEventListener(function(e){
      //     if(e.isPostChangeEvent()){
      //         //displayJSON(canvas);
      //     }
      // });
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
