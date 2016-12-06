import {cssRule,cssRaw} from "typestyle"
import * as csx from '../../../../base/csx';
import * as baseStyles from "../base";

/*
* Static styles should live in main.css
*/


cssRule('.monaco-editor.vs-dark. .current-line',
{
    background: baseStyles.tabBackgroundColor
})

cssRule('.monaco-editor.vs-dark .glyph-margin',
{
    background: baseStyles.monokaiBackgroundColor
})

cssRule('.monaco-editor.vs-dark .monaco-editor-background',
{
    background: baseStyles.monokaiBackgroundColor
})

cssRule('.vs-dark .monaco-workbench .monaco-editor-background',
{
    background: baseStyles.monokaiBackgroundColor
})
