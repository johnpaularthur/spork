import {cssRule,cssRaw} from "typestyle"
import * as csx from '../../../../base/csx';
import * as baseStyles from "../base";

/*
* Static styles should live in main.css
*/

/* We add a `.spork_selected` class to the tru active tab */
cssRule('.lm_tab.spork_selected', {
    color: baseStyles.tabActiveTextColor
})

cssRule('.lm_content', {
  backgroundColor: baseStyles.primaryBackgroundColor
})

cssRule('.spork_tipRoot',
 {
    backgroundColor: baseStyles.primaryBackgroundColor
})

cssRule('.lm_header',
{
    background: baseStyles.secondaryBackgroundColor
})

cssRule('.lm_header .lm_tab',
{
    background: baseStyles.tabBackgroundColor,
    color: baseStyles.tabTextColor,
    borderRight: '1px solid ' + baseStyles.tabBorderColor
})

cssRule('.lm_items',
{
    borderTop: '1px solid ' + baseStyles.tabBorderColor
})

cssRule('.lm_tab.lm_active',
{
    color: baseStyles.tabActiveTextColor,
    background: baseStyles.tabActiveBackgroundColor
})

