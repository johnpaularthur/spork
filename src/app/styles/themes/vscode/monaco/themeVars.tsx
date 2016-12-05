import {cssRule,cssRaw} from "typestyle"
import * as csx from '../../../../base/csx';
import * as baseStyles from "../base";

/*
* Static styles should live in main.css
*/

cssRule('.monaco-editor.vs-dark.vscode-theme-monokai-themes-Monokai-tmTheme .current-line',
{
    background: baseStyles.tabBackgroundColor
})

cssRule('.monaco-editor.vs-dark.vscode-theme-monokai-themes-Monokai-tmTheme .glyph-margin',
{
    background: baseStyles.monokaiBackgroundColor
})

cssRule('.monaco-editor.vs-dark.vscode-theme-monokai-themes-Monokai-tmTheme .monaco-editor-background',
{
    background: baseStyles.monokaiBackgroundColor
})
