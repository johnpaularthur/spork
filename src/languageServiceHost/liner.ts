import Debug = ts.Debug;

/**
 *  All the line stuff as it is from session.ts
 */
const lineCollectionCapacity = 4;

export class LineIndex {
    root: LineNode;
    // set this to true to check each edit for accuracy
    checkEdits = false;

    charOffsetToLineNumberAndPos(charOffset: number) {
        return this.root.charOffsetToLineNumberAndPos(1, charOffset);
    }

    lineNumberToInfo(lineNumber: number): ILineInfo {
        const lineCount = this.root.lineCount();
        if (lineNumber <= lineCount) {
            const lineInfo = this.root.lineNumberToInfo(lineNumber, 0);
            lineInfo.line = lineNumber;
            return lineInfo;
        }
        else {
            return {
                line: lineNumber,
                offset: this.root.charCount()
            };
        }
    }

    load(lines: string[]) {
        if (lines.length > 0) {
            const leaves: LineLeaf[] = [];
            for (let i = 0, len = lines.length; i < len; i++) {
                leaves[i] = new LineLeaf(lines[i]);
            }
            this.root = LineIndex.buildTreeFromBottom(leaves);
        }
        else {
            this.root = new LineNode();
        }
    }

    walk(rangeStart: number, rangeLength: number, walkFns: ILineIndexWalker) {
        this.root.walk(rangeStart, rangeLength, walkFns);
    }

    getText(rangeStart: number, rangeLength: number) {
        let accum = "";
        if ((rangeLength > 0) && (rangeStart < this.root.charCount())) {
            this.walk(rangeStart, rangeLength, {
                goSubtree: true,
                done: false,
                leaf: (relativeStart: number, relativeLength: number, ll: LineLeaf) => {
                    accum = accum.concat(ll.text.substring(relativeStart, relativeStart + relativeLength));
                }
            });
        }
        return accum;
    }

    getLength(): number {
        return this.root.charCount();
    }

    every(f: (ll: LineLeaf, s: number, len: number) => boolean, rangeStart: number, rangeEnd?: number) {
        if (!rangeEnd) {
            rangeEnd = this.root.charCount();
        }
        const walkFns = {
            goSubtree: true,
            done: false,
            leaf: function (relativeStart: number, relativeLength: number, ll: LineLeaf) {
                if (!f(ll, relativeStart, relativeLength)) {
                    this.done = true;
                }
            }
        };
        this.walk(rangeStart, rangeEnd - rangeStart, walkFns);
        return !walkFns.done;
    }

    edit(pos: number, deleteLength: number, newText?: string) {
        function editFlat(source: string, s: number, dl: number, nt = "") {
            return source.substring(0, s) + nt + source.substring(s + dl, source.length);
        }
        if (this.root.charCount() === 0) {
            // TODO: assert deleteLength === 0
            if (newText) {
                this.load(LineIndex.linesFromText(newText).lines);
                return this;
            }
        }
        else {
            let checkText: string;
            if (this.checkEdits) {
                checkText = editFlat(this.getText(0, this.root.charCount()), pos, deleteLength, newText);
            }
            const walker = new EditWalker();
            if (pos >= this.root.charCount()) {
                // insert at end
                pos = this.root.charCount() - 1;
                const endString = this.getText(pos, 1);
                if (newText) {
                    newText = endString + newText;
                }
                else {
                    newText = endString;
                }
                deleteLength = 0;
                walker.suppressTrailingText = true;
            }
            else if (deleteLength > 0) {
                // check whether last characters deleted are line break
                const e = pos + deleteLength;
                const lineInfo = this.charOffsetToLineNumberAndPos(e);
                if ((lineInfo && (lineInfo.offset === 0))) {
                    // move range end just past line that will merge with previous line
                    deleteLength += lineInfo.text.length;
                    // store text by appending to end of insertedText
                    if (newText) {
                        newText = newText + lineInfo.text;
                    }
                    else {
                        newText = lineInfo.text;
                    }
                }
            }
            if (pos < this.root.charCount()) {
                this.root.walk(pos, deleteLength, walker);
                walker.insertLines(newText);
            }
            if (this.checkEdits) {
                const updatedText = this.getText(0, this.root.charCount());
                Debug.assert(checkText == updatedText, "buffer edit mismatch");
            }
            return walker.lineIndex;
        }
    }

    static buildTreeFromBottom(nodes: LineCollection[]): LineNode {
        const nodeCount = Math.ceil(nodes.length / lineCollectionCapacity);
        const interiorNodes: LineNode[] = [];
        let nodeIndex = 0;
        for (let i = 0; i < nodeCount; i++) {
            interiorNodes[i] = new LineNode();
            let charCount = 0;
            let lineCount = 0;
            for (let j = 0; j < lineCollectionCapacity; j++) {
                if (nodeIndex < nodes.length) {
                    interiorNodes[i].add(nodes[nodeIndex]);
                    charCount += nodes[nodeIndex].charCount();
                    lineCount += nodes[nodeIndex].lineCount();
                }
                else {
                    break;
                }
                nodeIndex++;
            }
            interiorNodes[i].totalChars = charCount;
            interiorNodes[i].totalLines = lineCount;
        }
        if (interiorNodes.length === 1) {
            return interiorNodes[0];
        }
        else {
            return this.buildTreeFromBottom(interiorNodes);
        }
    }

    static linesFromText(text: string) {
        const lineStarts = ts.computeLineStarts(text);

        if (lineStarts.length === 0) {
            return { lines: <string[]>[], lineMap: lineStarts };
        }
        const lines = <string[]>new Array(lineStarts.length);
        const lc = lineStarts.length - 1;
        for (let lmi = 0; lmi < lc; lmi++) {
            lines[lmi] = text.substring(lineStarts[lmi], lineStarts[lmi + 1]);
        }

        const endText = text.substring(lineStarts[lc]);
        if (endText.length > 0) {
            lines[lc] = endText;
        }
        else {
            lines.length--;
        }
        return { lines: lines, lineMap: lineStarts };
    }
}

export class LineNode implements LineCollection {
    totalChars = 0;
    totalLines = 0;
    children: LineCollection[] = [];

    isLeaf() {
        return false;
    }

    updateCounts() {
        this.totalChars = 0;
        this.totalLines = 0;
        for (let i = 0, len = this.children.length; i < len; i++) {
            const child = this.children[i];
            this.totalChars += child.charCount();
            this.totalLines += child.lineCount();
        }
    }

    execWalk(rangeStart: number, rangeLength: number, walkFns: ILineIndexWalker, childIndex: number, nodeType: CharRangeSection) {
        if (walkFns.pre) {
            walkFns.pre(rangeStart, rangeLength, this.children[childIndex], this, nodeType);
        }
        if (walkFns.goSubtree) {
            this.children[childIndex].walk(rangeStart, rangeLength, walkFns);
            if (walkFns.post) {
                walkFns.post(rangeStart, rangeLength, this.children[childIndex], this, nodeType);
            }
        }
        else {
            walkFns.goSubtree = true;
        }
        return walkFns.done;
    }

    skipChild(relativeStart: number, relativeLength: number, childIndex: number, walkFns: ILineIndexWalker, nodeType: CharRangeSection) {
        if (walkFns.pre && (!walkFns.done)) {
            walkFns.pre(relativeStart, relativeLength, this.children[childIndex], this, nodeType);
            walkFns.goSubtree = true;
        }
    }

    walk(rangeStart: number, rangeLength: number, walkFns: ILineIndexWalker) {
        // assume (rangeStart < this.totalChars) && (rangeLength <= this.totalChars)
        let childIndex = 0;
        let child = this.children[0];
        let childCharCount = child.charCount();
        // find sub-tree containing start
        let adjustedStart = rangeStart;
        while (adjustedStart >= childCharCount) {
            this.skipChild(adjustedStart, rangeLength, childIndex, walkFns, CharRangeSection.PreStart);
            adjustedStart -= childCharCount;
            child = this.children[++childIndex];
            childCharCount = child.charCount();
        }
        // Case I: both start and end of range in same subtree
        if ((adjustedStart + rangeLength) <= childCharCount) {
            if (this.execWalk(adjustedStart, rangeLength, walkFns, childIndex, CharRangeSection.Entire)) {
                return;
            }
        }
        else {
            // Case II: start and end of range in different subtrees (possibly with subtrees in the middle)
            if (this.execWalk(adjustedStart, childCharCount - adjustedStart, walkFns, childIndex, CharRangeSection.Start)) {
                return;
            }
            let adjustedLength = rangeLength - (childCharCount - adjustedStart);
            child = this.children[++childIndex];
            childCharCount = child.charCount();
            while (adjustedLength > childCharCount) {
                if (this.execWalk(0, childCharCount, walkFns, childIndex, CharRangeSection.Mid)) {
                    return;
                }
                adjustedLength -= childCharCount;
                child = this.children[++childIndex];
                childCharCount = child.charCount();
            }
            if (adjustedLength > 0) {
                if (this.execWalk(0, adjustedLength, walkFns, childIndex, CharRangeSection.End)) {
                    return;
                }
            }
        }
        // Process any subtrees after the one containing range end
        if (walkFns.pre) {
            const clen = this.children.length;
            if (childIndex < (clen - 1)) {
                for (let ej = childIndex + 1; ej < clen; ej++) {
                    this.skipChild(0, 0, ej, walkFns, CharRangeSection.PostEnd);
                }
            }
        }
    }

    charOffsetToLineNumberAndPos(lineNumber: number, charOffset: number): ILineInfo {
        const childInfo = this.childFromCharOffset(lineNumber, charOffset);
        if (!childInfo.child) {
            return {
                line: lineNumber,
                offset: charOffset,
            };
        }
        else if (childInfo.childIndex < this.children.length) {
            if (childInfo.child.isLeaf()) {
                return {
                    line: childInfo.lineNumber,
                    offset: childInfo.charOffset,
                    text: (<LineLeaf>(childInfo.child)).text,
                    leaf: (<LineLeaf>(childInfo.child))
                };
            }
            else {
                const lineNode = <LineNode>(childInfo.child);
                return lineNode.charOffsetToLineNumberAndPos(childInfo.lineNumber, childInfo.charOffset);
            }
        }
        else {
            const lineInfo = this.lineNumberToInfo(this.lineCount(), 0);
            return { line: this.lineCount(), offset: lineInfo.leaf.charCount() };
        }
    }

    lineNumberToInfo(lineNumber: number, charOffset: number): ILineInfo {
        const childInfo = this.childFromLineNumber(lineNumber, charOffset);
        if (!childInfo.child) {
            return {
                line: lineNumber,
                offset: charOffset
            };
        }
        else if (childInfo.child.isLeaf()) {
            return {
                line: lineNumber,
                offset: childInfo.charOffset,
                text: (<LineLeaf>(childInfo.child)).text,
                leaf: (<LineLeaf>(childInfo.child))
            };
        }
        else {
            const lineNode = <LineNode>(childInfo.child);
            return lineNode.lineNumberToInfo(childInfo.relativeLineNumber, childInfo.charOffset);
        }
    }

    childFromLineNumber(lineNumber: number, charOffset: number) {
        let child: LineCollection;
        let relativeLineNumber = lineNumber;
        let i: number;
        let len: number;
        for (i = 0, len = this.children.length; i < len; i++) {
            child = this.children[i];
            const childLineCount = child.lineCount();
            if (childLineCount >= relativeLineNumber) {
                break;
            }
            else {
                relativeLineNumber -= childLineCount;
                charOffset += child.charCount();
            }
        }
        return {
            child: child,
            childIndex: i,
            relativeLineNumber: relativeLineNumber,
            charOffset: charOffset
        };
    }

    childFromCharOffset(lineNumber: number, charOffset: number) {
        let child: LineCollection;
        let i: number;
        let len: number;
        for (i = 0, len = this.children.length; i < len; i++) {
            child = this.children[i];
            if (child.charCount() > charOffset) {
                break;
            }
            else {
                charOffset -= child.charCount();
                lineNumber += child.lineCount();
            }
        }
        return {
            child: child,
            childIndex: i,
            charOffset: charOffset,
            lineNumber: lineNumber
        };
    }

    splitAfter(childIndex: number) {
        let splitNode: LineNode;
        const clen = this.children.length;
        childIndex++;
        const endLength = childIndex;
        if (childIndex < clen) {
            splitNode = new LineNode();
            while (childIndex < clen) {
                splitNode.add(this.children[childIndex++]);
            }
            splitNode.updateCounts();
        }
        this.children.length = endLength;
        return splitNode;
    }

    remove(child: LineCollection) {
        const childIndex = this.findChildIndex(child);
        const clen = this.children.length;
        if (childIndex < (clen - 1)) {
            for (let i = childIndex; i < (clen - 1); i++) {
                this.children[i] = this.children[i + 1];
            }
        }
        this.children.length--;
    }

    findChildIndex(child: LineCollection) {
        let childIndex = 0;
        const clen = this.children.length;
        while ((this.children[childIndex] !== child) && (childIndex < clen)) childIndex++;
        return childIndex;
    }

    insertAt(child: LineCollection, nodes: LineCollection[]) {
        let childIndex = this.findChildIndex(child);
        const clen = this.children.length;
        const nodeCount = nodes.length;
        // if child is last and there is more room and only one node to place, place it
        if ((clen < lineCollectionCapacity) && (childIndex === (clen - 1)) && (nodeCount === 1)) {
            this.add(nodes[0]);
            this.updateCounts();
            return [];
        }
        else {
            const shiftNode = this.splitAfter(childIndex);
            let nodeIndex = 0;
            childIndex++;
            while ((childIndex < lineCollectionCapacity) && (nodeIndex < nodeCount)) {
                this.children[childIndex++] = nodes[nodeIndex++];
            }
            let splitNodes: LineNode[] = [];
            let splitNodeCount = 0;
            if (nodeIndex < nodeCount) {
                splitNodeCount = Math.ceil((nodeCount - nodeIndex) / lineCollectionCapacity);
                splitNodes = <LineNode[]>new Array(splitNodeCount);
                let splitNodeIndex = 0;
                for (let i = 0; i < splitNodeCount; i++) {
                    splitNodes[i] = new LineNode();
                }
                let splitNode = <LineNode>splitNodes[0];
                while (nodeIndex < nodeCount) {
                    splitNode.add(nodes[nodeIndex++]);
                    if (splitNode.children.length === lineCollectionCapacity) {
                        splitNodeIndex++;
                        splitNode = <LineNode>splitNodes[splitNodeIndex];
                    }
                }
                for (let i = splitNodes.length - 1; i >= 0; i--) {
                    if (splitNodes[i].children.length === 0) {
                        splitNodes.length--;
                    }
                }
            }
            if (shiftNode) {
                splitNodes[splitNodes.length] = shiftNode;
            }
            this.updateCounts();
            for (let i = 0; i < splitNodeCount; i++) {
                (<LineNode>splitNodes[i]).updateCounts();
            }
            return splitNodes;
        }
    }

    // assume there is room for the item; return true if more room
    add(collection: LineCollection) {
        this.children[this.children.length] = collection;
        return (this.children.length < lineCollectionCapacity);
    }

    charCount() {
        return this.totalChars;
    }

    lineCount() {
        return this.totalLines;
    }
}

export class LineLeaf implements LineCollection {
    udata: any;

    constructor(public text: string) {

    }

    setUdata(data: any) {
        this.udata = data;
    }

    getUdata() {
        return this.udata;
    }

    isLeaf() {
        return true;
    }

    walk(rangeStart: number, rangeLength: number, walkFns: ILineIndexWalker) {
        walkFns.leaf(rangeStart, rangeLength, this);
    }

    charCount() {
        return this.text.length;
    }

    lineCount() {
        return 1;
    }
}

export interface LineCollection {
    charCount(): number;
    lineCount(): number;
    isLeaf(): boolean;
    walk(rangeStart: number, rangeLength: number, walkFns: ILineIndexWalker): void;
}

export interface ILineInfo {
    line: number;
    offset: number;
    text?: string;
    leaf?: LineLeaf;
}

export enum CharRangeSection {
    PreStart,
    Start,
    Entire,
    Mid,
    End,
    PostEnd
}

export interface ILineIndexWalker {
    goSubtree: boolean;
    done: boolean;
    leaf(relativeStart: number, relativeLength: number, lineCollection: LineLeaf): void;
    pre?(relativeStart: number, relativeLength: number, lineCollection: LineCollection,
        parent: LineNode, nodeType: CharRangeSection): LineCollection;
    post?(relativeStart: number, relativeLength: number, lineCollection: LineCollection,
        parent: LineNode, nodeType: CharRangeSection): LineCollection;
}

class BaseLineIndexWalker implements ILineIndexWalker {
    goSubtree = true;
    done = false;
    leaf(rangeStart: number, rangeLength: number, ll: LineLeaf) {
    }
}

class EditWalker extends BaseLineIndexWalker {
    lineIndex = new LineIndex();
    // path to start of range
    startPath: LineCollection[];
    endBranch: LineCollection[] = [];
    branchNode: LineNode;
    // path to current node
    stack: LineNode[];
    state = CharRangeSection.Entire;
    lineCollectionAtBranch: LineCollection;
    initialText = "";
    trailingText = "";
    suppressTrailingText = false;

    constructor() {
        super();
        this.lineIndex.root = new LineNode();
        this.startPath = [this.lineIndex.root];
        this.stack = [this.lineIndex.root];
    }

    insertLines(insertedText: string) {
        if (this.suppressTrailingText) {
            this.trailingText = "";
        }
        if (insertedText) {
            insertedText = this.initialText + insertedText + this.trailingText;
        }
        else {
            insertedText = this.initialText + this.trailingText;
        }
        const lm = LineIndex.linesFromText(insertedText);
        const lines = lm.lines;
        if (lines.length > 1) {
            if (lines[lines.length - 1] == "") {
                lines.length--;
            }
        }
        let branchParent: LineNode;
        let lastZeroCount: LineCollection;

        for (let k = this.endBranch.length - 1; k >= 0; k--) {
            (<LineNode>this.endBranch[k]).updateCounts();
            if (this.endBranch[k].charCount() === 0) {
                lastZeroCount = this.endBranch[k];
                if (k > 0) {
                    branchParent = <LineNode>this.endBranch[k - 1];
                }
                else {
                    branchParent = this.branchNode;
                }
            }
        }
        if (lastZeroCount) {
            branchParent.remove(lastZeroCount);
        }

        // path at least length two (root and leaf)
        let insertionNode = <LineNode>this.startPath[this.startPath.length - 2];
        const leafNode = <LineLeaf>this.startPath[this.startPath.length - 1];
        const len = lines.length;

        if (len > 0) {
            leafNode.text = lines[0];

            if (len > 1) {
                let insertedNodes = <LineCollection[]>new Array(len - 1);
                let startNode = <LineCollection>leafNode;
                for (let i = 1, len = lines.length; i < len; i++) {
                    insertedNodes[i - 1] = new LineLeaf(lines[i]);
                }
                let pathIndex = this.startPath.length - 2;
                while (pathIndex >= 0) {
                    insertionNode = <LineNode>this.startPath[pathIndex];
                    insertedNodes = insertionNode.insertAt(startNode, insertedNodes);
                    pathIndex--;
                    startNode = insertionNode;
                }
                let insertedNodesLen = insertedNodes.length;
                while (insertedNodesLen > 0) {
                    const newRoot = new LineNode();
                    newRoot.add(this.lineIndex.root);
                    insertedNodes = newRoot.insertAt(this.lineIndex.root, insertedNodes);
                    insertedNodesLen = insertedNodes.length;
                    this.lineIndex.root = newRoot;
                }
                this.lineIndex.root.updateCounts();
            }
            else {
                for (let j = this.startPath.length - 2; j >= 0; j--) {
                    (<LineNode>this.startPath[j]).updateCounts();
                }
            }
        }
        else {
            // no content for leaf node, so delete it
            insertionNode.remove(leafNode);
            for (let j = this.startPath.length - 2; j >= 0; j--) {
                (<LineNode>this.startPath[j]).updateCounts();
            }
        }

        return this.lineIndex;
    }

    post(relativeStart: number, relativeLength: number, lineCollection: LineCollection, parent: LineCollection, nodeType: CharRangeSection): LineCollection {
        // have visited the path for start of range, now looking for end
        // if range is on single line, we will never make this state transition
        if (lineCollection === this.lineCollectionAtBranch) {
            this.state = CharRangeSection.End;
        }
        // always pop stack because post only called when child has been visited
        this.stack.length--;
        return undefined;
    }

    pre(relativeStart: number, relativeLength: number, lineCollection: LineCollection, parent: LineCollection, nodeType: CharRangeSection) {
        // currentNode corresponds to parent, but in the new tree
        const currentNode = this.stack[this.stack.length - 1];

        if ((this.state === CharRangeSection.Entire) && (nodeType === CharRangeSection.Start)) {
            // if range is on single line, we will never make this state transition
            this.state = CharRangeSection.Start;
            this.branchNode = currentNode;
            this.lineCollectionAtBranch = lineCollection;
        }

        let child: LineCollection;
        function fresh(node: LineCollection): LineCollection {
            if (node.isLeaf()) {
                return new LineLeaf("");
            }
            else return new LineNode();
        }
        switch (nodeType) {
            case CharRangeSection.PreStart:
                this.goSubtree = false;
                if (this.state !== CharRangeSection.End) {
                    currentNode.add(lineCollection);
                }
                break;
            case CharRangeSection.Start:
                if (this.state === CharRangeSection.End) {
                    this.goSubtree = false;
                }
                else {
                    child = fresh(lineCollection);
                    currentNode.add(child);
                    this.startPath[this.startPath.length] = child;
                }
                break;
            case CharRangeSection.Entire:
                if (this.state !== CharRangeSection.End) {
                    child = fresh(lineCollection);
                    currentNode.add(child);
                    this.startPath[this.startPath.length] = child;
                }
                else {
                    if (!lineCollection.isLeaf()) {
                        child = fresh(lineCollection);
                        currentNode.add(child);
                        this.endBranch[this.endBranch.length] = child;
                    }
                }
                break;
            case CharRangeSection.Mid:
                this.goSubtree = false;
                break;
            case CharRangeSection.End:
                if (this.state !== CharRangeSection.End) {
                    this.goSubtree = false;
                }
                else {
                    if (!lineCollection.isLeaf()) {
                        child = fresh(lineCollection);
                        currentNode.add(child);
                        this.endBranch[this.endBranch.length] = child;
                    }
                }
                break;
            case CharRangeSection.PostEnd:
                this.goSubtree = false;
                if (this.state !== CharRangeSection.Start) {
                    currentNode.add(lineCollection);
                }
                break;
        }
        if (this.goSubtree) {
            this.stack[this.stack.length] = <LineNode>child;
        }
        return lineCollection;
    }
    // just gather text from the leaves
    leaf(relativeStart: number, relativeLength: number, ll: LineLeaf) {
        if (this.state === CharRangeSection.Start) {
            this.initialText = ll.text.substring(0, relativeStart);
        }
        else if (this.state === CharRangeSection.Entire) {
            this.initialText = ll.text.substring(0, relativeStart);
            this.trailingText = ll.text.substring(relativeStart + relativeLength);
        }
        else {
            // state is CharRangeSection.End
            this.trailingText = ll.text.substring(relativeStart + relativeLength);
        }
    }
}
