/**
 * This is the backend for the uml diagram view
 */

/** Imports */
import * as utils from "../../../../common/utils";
import * as types from "../../../../common/types";
import * as fmc from "../../../../server/disk/fileModelCache";

import {getDocumentedTypeLocation} from "../modules/astUtils";

/** We just use the *active* project if any */
import * as activeProject from "../activeProject";
let getProject = activeProject.GetProject.getCurrentIfAny;

var xml2js = require('xml2js');
var parser = new xml2js.Parser({explicitArray: false});
var builder = new xml2js.Builder({headless: true,pretty: false});


/**
 * Get a json structure for a pentaho xml file
 */
export function getJsonForFile(query: { filePath: string }):  Promise<string> {

    // let project = activeProject.GetProject.getCurrentIfAny();
    // var languageService = project.languageService;
    const filePath = query.filePath;
    const file = fmc.getOrCreateOpenFile(filePath);

    const contents = file.getContents()

    return getObject(contents).then(getFileInfo)

}

function hashCode(e) {

  var char, hash, i;
  hash = 0;
  if (e.length === 0) {
    return hash;
  }
  i = 0;
  while (i < e.length) {
    char = e.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
    i++;
  }

  return hash;
}

export function getObject(contents: string) {
    //console.log(contents);
    return new Promise((resolve, reject) =>
        parser.parseString(contents, function (err, result) {
            //console.log(result);
            resolve(result);
        })
    );

}

function getFileInfo(jsObject) {
    let content;
    let nodes = new Array;

    if(jsObject.hasOwnProperty("job")){
        content = jsObject.job

        if(content.hasOwnProperty("entries")){
            let entries = getJobNodes(content.entries)
            if (entries) {
                nodes = [...nodes,...entries]
            }
        }
        if(content.hasOwnProperty("hops")){
            let hops = getJobLinks(content.hops)
            if(hops){
                nodes = [...nodes,...hops]
            }
        }
        if(content.hasOwnProperty("notepads")){
            let notepads = getNotes(content.notepads)
            if (notepads) {
                nodes = [...nodes,...notepads]
            }
        }

    }else{

        content = jsObject.transformation

        if(content.hasOwnProperty("step")){
            let entries = getTransformationNodes(content);
            if (entries) {
                nodes = [...nodes,...entries]
            }
        }
        if(content.hasOwnProperty("order")){
            let hops = getTransformationLinks(content.order);
            if (hops) {
                nodes = [...nodes,...hops]
            }
        }
        if(content.hasOwnProperty("notepads")){
            let notepads = getNotes(content.notepads)
            if (notepads) {
                nodes = [...nodes,...notepads]
            }
        }
        //console.log(jsObject.transformation)

    }

    return JSON.stringify(nodes, null, 2)

}

function getJobInfo(jsObject){

    let fileHash = {
        type: 'job',
        name: '',
        directory: ''
    }

    let finfo = jsObject.job;

    fileHash.name = finfo.name
    fileHash.directory = finfo.directory

    console.log(fileHash)
    return fileHash
}

function getTransformationInfo(jsObject){

    let fileHash = {
        type: 'trans',
        name: '',
        directory: ''
    }

    let finfo = jsObject.transformation.info;

    fileHash.name = finfo.name
    fileHash.directory = finfo.directory

    console.log(fileHash)
    return fileHash
}

function getJobNodes(jobEntries) {
    let nodes = new Array
    let entries
    // These are strangely rendered by xml2js
    // job.entries will always be a single node followed by an "entry" array,
    // so we assign entries = job.entries.entry
    if(jobEntries.hasOwnProperty("entry")){
        entries= jobEntries.entry
        //console.log("entries:",entries)
    }else{
        return nodes
    }

    for (let k = 0, len = entries.length; k < len; k++) {

        let entry = entries[k];

        let comp = {};
        comp['type'] = "draw2d.shape.composite.Group";
        comp['id'] = hashCode("comp:" + entry.name);
        comp['x'] = entry.xloc;
        comp['y'] = entry.yloc;
        comp['width'] = 50;
        comp['height'] = 50;
        let icons = {};
        icons['type'] = "draw2d.shape.icon.Star3";
        icons['userData'] = {type:entry.type};
        icons['cssClass'] = "draw2d_shape_node_UNKNOWN";
            if (entry.type === "SPECIAL") {
            if (entry.start === "Y") {
                icons['type'] = "draw2d.shape.icon.Star3";
                icons['userData'] = {type:'START'};
                icons['cssClass'] = "draw2d_shape_node_START";
            }
            if (entry.dummy === "Y") {
                icons['type'] = "draw2d.shape.icon.Star3";
                icons['userData'] = {type:'DUMMY'};
                icons['cssClass'] = "draw2d_shape_node_DUMMY";
            }
            }
        icons['id'] = hashCode("icon" + entry.name);
        icons['x'] = parseInt(entry.xloc) + 12.5;
        icons['y'] = parseInt(entry.yloc) + 12.5;
        icons['width'] = 25;
        icons['height'] = 25;
        icons['composite'] = hashCode("comp:" + entry.name);

        let drawNodes = {};
        drawNodes['type'] = "edo.LabeledBox";
        drawNodes['id'] = hashCode(entry.name);
        drawNodes['x'] = entry.xloc;
        drawNodes['y'] = entry.yloc;
        drawNodes['width'] = 50;
        drawNodes['height'] = 50;
        drawNodes['alpha'] = 1;
        drawNodes['angle'] = 0;
        drawNodes['userData'] = {};
        drawNodes['cssClass'] = "draw2d_shape_node_" + entry.type;
        drawNodes['stroke'] = 1;
        drawNodes['radius'] = 2;
        drawNodes['dasharray'] = null;
        drawNodes['composite'] = hashCode("comp:" + entry.name);
        drawNodes['ports'] = [
          {
            "type": "draw2d.InputPort",
            "id": hashCode("input:" + entry.name),
            "width": 10,
            "height": 10,
            "alpha": 1,
            "angle": 0,
            "userData": {},
            "cssClass": "draw2d_InputPort",
            "bgColor": "#4F6870",
            "color": "#1B1B1B",
            "stroke": 1,
            "dasharray": null,
            "maxFanOut": 9007199254740991,
            "name": "input0",
            "port": "draw2d.InputPort",
            "locator": "draw2d.layout.locator.InputPortLocator"
          }, {
            "type": "draw2d.OutputPort",
            "id": hashCode("output:" + entry.name),
            "width": 10,
            "height": 10,
            "alpha": 1,
            "angle": 0,
            "userData": {},
            "cssClass": "draw2d_OutputPort",
            "bgColor": "#4F6870",
            "color": "#1B1B1B",
            "stroke": 1,
            "dasharray": null,
            "maxFanOut": 9007199254740991,
            "name": "output0",
            "port": "draw2d.OutputPort",
            "locator": "draw2d.layout.locator.OutputPortLocator"
          }
        ];
        drawNodes['labels'] = [
          {
            "type": "draw2d.shape.basic.Label",
            "id": hashCode("label:" + entry.name),
            "text": entry.name,
            "fontSize": 9,
            "locator": "draw2d.layout.locator.BottomLocator"
          }
        ];

        nodes.push(comp);
        nodes.push(drawNodes);
        nodes.push(icons);

      }

      return nodes
}

function getJobLinks(jobHops) {
    let links = new Array
    let hops

    // These are strangely rendered by xml2js
    // job.hops will always be a single node followed by an "hop" array,
    // so we assign hops = job.hops.hop
    if(jobHops.hasOwnProperty("hop")){
        hops = jobHops.hop
    }else{
        return
    }

    for (let k = 0, len = hops.length; k < len; k++) {

        let hop = hops[k];
        let hopname = hop.from + " -> " + hop.to;
        let drawHops = {}
        drawHops['type'] = "draw2d.Connection";
        drawHops['id'] = hashCode(hopname);
        drawHops['alpha'] = 1;
        drawHops['angle'] = 0;
        drawHops['userData'] = {};
        drawHops['cssClass'] = "draw2d_Connection";
        if (hop.evaluation === "Y") {
          drawHops['cssClass'] = "draw2d_Connection_SUCCESS";
        }
        if (hop.evaluation === "N") {
          drawHops['cssClass'] = "draw2d_Connection_FAIL";
        }
        if (hop.unconditional === "Y") {
          drawHops['cssClass'] = "draw2d_Connection_UNCONDITIONAL";
        }
        if (hop.enabled === "N") {
          drawHops['alpha'] = 0.3;
        }
        drawHops['stroke'] = 2;
        drawHops['color'] = "#129CE4";
        drawHops['outlineStroke'] = 0;
        drawHops['outlineColor'] = "none";
        drawHops['radius'] = 3;
        drawHops['source'] = {
          node: hashCode(hop.from),
          port: "output0",
        };
        drawHops['target'] = {
          node: hashCode(hop.to),
          port: "input0",
          "decoration": "draw2d.decoration.connection.ArrowDecorator"
        };

        links.push(drawHops);
    }

    return links
}

function getNotes(jobNotepads) {
    let notes = new Array
    let notepads

    // These are strangely rendered by xml2js
    // job.notepads will always be a single node followed by an "notepad" array,
    // so we assign notepads = job.notepads.notepad
    // this works for transfromations as well
    if(jobNotepads.hasOwnProperty("notepad")){
        notepads = jobNotepads.notepad
    }else{
        return
    }

    for (let k = 0, len = notepads.length; k < len; k++) {

        let note = notepads[k];
        let noteItem = {};
        noteItem["type"] = "draw2d.shape.note.PostIt";
        noteItem["id"] = hashCode(note.note);
        noteItem["text"] = note.note;
        noteItem["fontSize"] = note.fontsize;
        noteItem["fontFamily"] = note.fontname;
        noteItem["x"] = note.xloc;
        noteItem["y"] = note.yloc;
        noteItem["minWidth"] = note.width;
        noteItem["minHeight"] = note.height;
        noteItem["bgColor"] = [note.backgroundcolorred,note.backgroundcolorgreen,note.backgroundcolorblue]
        noteItem["fontColor"] = [note.fontcolorred,note.fontcolorgreen,note.fontcolorblue]
        noteItem["outlineColor"] = [note.bordercolorred,note.bordercolorgreen,note.bordercolorblue]

        notes.push(noteItem);
    }

    return notes
}

function getTransformationNodes(transformationSteps) {
    //console.log(transformationSteps)

    let nodes = new Array
    let steps
    // These are strangely rendered by xml2js
    // job.entries will always be a single node followed by an "step" array,
    // so we assign entries = job.entries.entry
    if(transformationSteps.hasOwnProperty("step")){
        steps = transformationSteps.step
        //console.log("entries:",entries)
    }else{
        return nodes
    }

    for (let k = 0, len = steps.length; k < len; k++) {

        let entry = steps[k];

        let comp = {};
        comp['type'] = "draw2d.shape.composite.Group";
        comp['id'] = hashCode("comp:" + entry.name);
        comp['x'] = entry.GUI.xloc;
        comp['y'] = entry.GUI.yloc;
        comp['width'] = 50;
        comp['height'] = 50;


        let icons = {};
        icons['type'] = "draw2d.shape.icon.Star3";
        icons['userData'] = {type:entry.type};
        icons['cssClass'] = "draw2d_shape_node_" + entry.type;
        icons['id'] = hashCode("icon" + entry.name);
        icons['x'] = parseInt(entry.GUI.xloc) + 12.5;
        icons['y'] = parseInt(entry.GUI.yloc) + 12.5;
        icons['width'] = 25;
        icons['height'] = 25;
        icons['composite'] = hashCode("comp:" + entry.name);

        let drawNodes = {};
        drawNodes['type'] = "edo.LabeledBox";
        drawNodes['id'] = hashCode(entry.name);
        drawNodes['x'] = entry.GUI.xloc;
        drawNodes['y'] = entry.GUI.yloc;
        drawNodes['width'] = 50;
        drawNodes['height'] = 50;
        drawNodes['alpha'] = 1;
        drawNodes['angle'] = 0;
        drawNodes['userData'] = {};
        drawNodes['cssClass'] = "draw2d_shape_node_" + entry.type;
        drawNodes['stroke'] = 1;
        drawNodes['radius'] = 2;
        drawNodes['dasharray'] = null;
        drawNodes['composite'] = hashCode("comp:" + entry.name);
        drawNodes['ports'] = [
          {
            "type": "draw2d.InputPort",
            "id": hashCode("input:" + entry.name),
            "width": 10,
            "height": 10,
            "alpha": 1,
            "angle": 0,
            "userData": {},
            "cssClass": "draw2d_InputPort",
            "bgColor": "#4F6870",
            "color": "#1B1B1B",
            "stroke": 1,
            "dasharray": null,
            "maxFanOut": 9007199254740991,
            "name": "input0",
            "port": "draw2d.InputPort",
            "locator": "draw2d.layout.locator.InputPortLocator"
          }, {
            "type": "draw2d.OutputPort",
            "id": hashCode("output:" + entry.name),
            "width": 10,
            "height": 10,
            "alpha": 1,
            "angle": 0,
            "userData": {},
            "cssClass": "draw2d_OutputPort",
            "bgColor": "#4F6870",
            "color": "#1B1B1B",
            "stroke": 1,
            "dasharray": null,
            "maxFanOut": 9007199254740991,
            "name": "output0",
            "port": "draw2d.OutputPort",
            "locator": "draw2d.layout.locator.OutputPortLocator"
          }
        ];
        drawNodes['labels'] = [
          {
            "type": "draw2d.shape.basic.Label",
            "id": hashCode("label:" + entry.name),
            "text": entry.name,
            "fontSize": 9,
            "locator": "draw2d.layout.locator.BottomLocator"
          }
        ];

        nodes.push(comp);
        nodes.push(drawNodes);
        nodes.push(icons);

      }

      return nodes
}

function getTransformationLinks(transformationHops) {
    let links = new Array
    let hops

    // These are strangely rendered by xml2js
    // transformation.order will always be a single node followed by an "hop" array,
    // so we assign hops = transformation.order.hop
    if(transformationHops.hasOwnProperty("hop")){
        hops = transformationHops.hop
    }else{
        return
    }

    for (let k = 0, len = hops.length; k < len; k++) {

        let hop = hops[k];
        let hopname = hop.from + " -> " + hop.to;
        let drawHops = {}
        hopname = hop.from + " -> " + hop.to;
        drawHops['type'] = "draw2d.Connection";
        drawHops['id'] = hashCode(hopname);
        drawHops['alpha'] = 1;
        drawHops['angle'] = 0;
        drawHops['userData'] = {};
        drawHops['cssClass'] = "draw2d_Connection";
        if (hop.evaluation === "Y") {
            drawHops['cssClass'] = "draw2d_Connection_SUCCESS";
        }
        if (hop.evaluation === "N") {
            drawHops['cssClass'] = "draw2d_Connection_FAIL";
        }
        if (hop.unconditional === "Y") {
            drawHops['cssClass'] = "draw2d_Connection_UNCONDITIONAL";
        }
        if (hop.enabled === "N") {
            drawHops['alpha'] = 0.3;
        }
        drawHops['stroke'] = 2;
        drawHops['color'] = "#129CE4";
        drawHops['outlineStroke'] = 0;
        drawHops['outlineColor'] = "none";
        drawHops['radius'] = 3;
        drawHops['source'] = {
            node: hashCode(hop.from),
            port: "output0"
        };
        drawHops['target'] = {
            node: hashCode(hop.to),
            port: "input0",
            "decoration": "draw2d.decoration.connection.ArrowDecorator"
        };

        links.push(drawHops);
    }

    return links
}


export function getClasses({sourceFile, program}: { sourceFile: ts.SourceFile, program: ts.Program }): types.UMLClass[] {
    const result: types.UMLClass[] = [];
    const typeChecker = program.getTypeChecker();
    const collect = (cls: types.UMLClass) => result.push(cls);

    collectClasses({
        node: sourceFile,
        collect,

        sourceFile,
        program,
    });

    return result;
}

function collectClasses(config: { node: ts.SourceFile | ts.ModuleBlock | ts.ModuleDeclaration, sourceFile: ts.SourceFile, program: ts.Program, collect: (cls: types.UMLClass) => void }) {

    const {sourceFile, program, collect} = config;

    ts.forEachChild(config.node, node => {
        if (node.kind == ts.SyntaxKind.ClassDeclaration) {
            collect(transformClass(node as ts.ClassDeclaration, sourceFile, program));
        }

        // Support recursively looking into `a.b.c` style namespaces as well
        if (node.kind === ts.SyntaxKind.ModuleDeclaration) {
            collectClasses({ node: node as ts.ModuleDeclaration, collect, program, sourceFile });
        }
        if (node.kind === ts.SyntaxKind.ModuleBlock) {
            collectClasses({ node: node as ts.ModuleBlock, collect, program, sourceFile });
        }
    });
}

/**
 * Various Transformers
 */

function transformClass(node: ts.ClassDeclaration, sourceFile: ts.SourceFile, program: ts.Program): types.UMLClass {
    const result: types.UMLClass = {
        name: node.name.text,
        icon: types.IconType.Class,
        location: getDocumentedTypeLocation(sourceFile, node.name.pos),

        members: [],
        extends: null,
    }
    if (node.typeParameters) {
        result.icon = types.IconType.ClassGeneric;
    }

    /** Collect members */
    ts.forEachChild(node, (node) => {
        if (node.kind == ts.SyntaxKind.Constructor) {
            result.members.push(transformClassConstructor(node as ts.ConstructorDeclaration, sourceFile));
        }
        if (node.kind == ts.SyntaxKind.PropertyDeclaration) {
            result.members.push(transformClassProperty(node as ts.PropertyDeclaration, sourceFile));
        }
        if (node.kind == ts.SyntaxKind.MethodDeclaration) {
            result.members.push(transformClassMethod(node as ts.MethodDeclaration, sourceFile));
        }
        if (node.kind == ts.SyntaxKind.IndexSignature) {
            result.members.push(transformClassIndexSignature(node as ts.IndexSignatureDeclaration, sourceFile));
        }
    });

    /** Collect parent classes */
    const classDeclaration = node;
    if (classDeclaration.heritageClauses) {
        let extendsClause = classDeclaration.heritageClauses.find(c => c.token === ts.SyntaxKind.ExtendsKeyword);
        if (extendsClause && extendsClause.types.length > 0) {
            const expression = extendsClause.types[0];
            const typeChecker = program.getTypeChecker();
            const symbol = typeChecker.getTypeAtLocation(expression.expression).symbol;
            if (symbol) {
                const valueDeclaration = symbol.valueDeclaration;
                if (valueDeclaration && valueDeclaration.kind === ts.SyntaxKind.ClassDeclaration) {
                    const node = valueDeclaration as ts.ClassDeclaration;
                    const nodeSourceFile = node.getSourceFile();
                    result.extends = transformClass(node, nodeSourceFile, program);
                }
            }
        }
    }

    /** Figure out any override */
    if (result.extends) {
        /** Collect all parents */
        const parents: types.UMLClass[] = [];
        let parent = result.extends;
        while (parent) {
            parents.push(parent);
            parent = parent.extends;
        }
        /** For each member check if a parent has a member with the same name */
        result.members.forEach(m => {
            if (m.name === "constructor") return; // (except for constructor)
            parents.forEach(p => {
                const matchedParentMember = p.members.find(pm => pm.lifetime === types.UMLClassMemberLifetime.Instance && pm.name === m.name)
                if (matchedParentMember) {
                    m.override = matchedParentMember;
                }
            });
        });
    }

    return result;
}

/** Class Constructor */
function transformClassConstructor(node: ts.ConstructorDeclaration, sourceFile: ts.SourceFile): types.UMLClassMember {
    const name = "constructor";
    let icon = types.IconType.ClassConstructor;
    const location = getDocumentedTypeLocation(sourceFile, node.pos);
    const result: types.UMLClassMember = {
        name,
        icon,
        location,

        visibility: types.UMLClassMemberVisibility.Public,
        lifetime: types.UMLClassMemberLifetime.Instance,
    }

    return result;
}

/** Class Property */
function transformClassProperty(node: ts.PropertyDeclaration, sourceFile: ts.SourceFile): types.UMLClassMember {
    const name = ts.getPropertyNameForPropertyNameNode(node.name);
    let icon = types.IconType.ClassProperty;
    const location = getDocumentedTypeLocation(sourceFile, node.name.getEnd() - 1);
    const visibility = getVisibility(node);
    const lifetime = getLifetime(node);

    const result: types.UMLClassMember = {
        name,
        icon,
        location,

        visibility,
        lifetime,
    }

    return result;
}

/** Class Method */
function transformClassMethod(node: ts.MethodDeclaration, sourceFile: ts.SourceFile): types.UMLClassMember {
    const name = ts.getPropertyNameForPropertyNameNode(node.name);
    let icon = types.IconType.ClassMethod;
    if (node.typeParameters) {
        icon = types.IconType.ClassMethodGeneric;
    }
    const location = getDocumentedTypeLocation(sourceFile, node.name.getEnd() - 1);
    const visibility = getVisibility(node);
    const lifetime = getLifetime(node);

    const result: types.UMLClassMember = {
        name,
        icon,
        location,

        visibility,
        lifetime,
    }

    return result;
}

/** Class Index Signature */
function transformClassIndexSignature(node: ts.IndexSignatureDeclaration, sourceFile: ts.SourceFile): types.UMLClassMember {
    const name = "Index Signature";
    let icon = types.IconType.ClassIndexSignature;
    let location = getDocumentedTypeLocation(sourceFile, node.pos);

    const result: types.UMLClassMember = {
        name,
        icon,
        location,

        visibility: types.UMLClassMemberVisibility.Public,
        lifetime: types.UMLClassMemberLifetime.Instance,
    }

    return result;
}

/**
 *
 * General Utilities
 *
 */

/** Visibility */
function getVisibility(node: ts.Node): types.UMLClassMemberVisibility {
    if (node.modifiers) {
        if (hasModifierSet(node.modifiers, ts.ModifierFlags.Protected)) {
            return types.UMLClassMemberVisibility.Protected;
        } else if (hasModifierSet(node.modifiers, ts.ModifierFlags.Private)) {
            return types.UMLClassMemberVisibility.Private;
        } else if (hasModifierSet(node.modifiers, ts.ModifierFlags.Public)) {
            return types.UMLClassMemberVisibility.Public;
        } else if (hasModifierSet(node.modifiers, ts.ModifierFlags.Export)) {
            return types.UMLClassMemberVisibility.Public;
        }
    }
    switch (node.parent.kind) {
        case ts.SyntaxKind.ClassDeclaration:
            return types.UMLClassMemberVisibility.Public;
        case ts.SyntaxKind.ModuleDeclaration:
            return types.UMLClassMemberVisibility.Private;
    }
    return types.UMLClassMemberVisibility.Private;
}

/** Lifetime */
function getLifetime(node: ts.Node): types.UMLClassMemberLifetime {
    if (node.modifiers) {
        if (hasModifierSet(node.modifiers, ts.ModifierFlags.Static)) {
            return types.UMLClassMemberLifetime.Static;
        }
    }
    return types.UMLClassMemberLifetime.Instance;
}

/** Just checks if a flag is set */
function hasModifierSet(modifiers: ts.NodeArray<ts.Modifier>, modifier: number) {
    return modifiers.some(value => (value.flags & modifier) === modifier);
}
