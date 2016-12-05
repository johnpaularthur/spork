import {cssRule,cssRaw} from "typestyle"
import * as csx from '../../../../base/csx';
import * as baseStyles from "../base";



/* We add a `.spork_selected` class to the tru active tab */
cssRule('.lm_tab.spork_selected', {
    color: baseStyles.tabActiveTextColor
})

cssRule('.lm_content', {
  backgroundColor: baseStyles.primaryBackgroundColor
})

cssRule('spork_tipRoot',
 {
    backgroundColor: baseStyles.primaryBackgroundColor
})
