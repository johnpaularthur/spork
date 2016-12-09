'use strict';

export function setupMonacoPentaho() {
    monaco.languages.register({
        id: 'pentaho',
        extensions: [ '.kdb', '.ktr', '.kjb' ],
        firstLine : '(\\<\\?xml.*)|(\\<svg)|(\\<\\!doctype\\s+svg)|(\\<job)|(\\<trans)',
        aliases: [ 'KDB', 'KTR', 'KJB', 'kdb', 'ktr', 'kjb' ],
        mimetypes: ['text/xml', 'application/xml', 'application/xaml+xml', 'application/xml-dtd'],
    });
    monaco.languages.onLanguage('pentaho', () => {
        const languageId = 'pentaho';

        /** Setup bracket matching etc. */
        monaco.languages.setLanguageConfiguration(languageId, richEditConfiguration);

        /** Set the tokens provider for a language (monarch implementation). */
        monaco.languages.setMonarchTokensProvider(languageId, monarchLanguage);

    });
}

const richEditConfiguration: monaco.languages.LanguageConfiguration = {

	comments: {
		blockComment: ['<!--', '-->'],
	},
	brackets: [['{','}'],['[',']'],['(',')'],['<','>']],
	autoClosingPairs: [
		{ open: '\'', close: '\'', notIn: ['string', 'comment'] },
		{ open: '"', close: '"', notIn: ['string', 'comment'] },
	]
	// enhancedBrackets: [{
	// 	tokenType: 'tag.tag-$1.xml',
	// 	openTrigger: '>',
	// 	open: /<(\w[\w\d]*)([^\/>]*(?!\/)>)[^<>]*$/i,
	// 	closeComplete: '</$1>',
	// 	closeTrigger: '>',
	// 	close: /<\/(\w[\w\d]*)\s*>$/i

};

const monarchLanguage: monaco.languages.IMonarchLanguage = {
	defaultToken: '',
	tokenPostfix: '.xml',

	ignoreCase: true,

	// Useful regular expressions
	qualifiedName: /(?:[\w\.\-]+:)?[\w\.\-]+/,

	tokenizer: {
		root: [
			[/[^<&]+/, ''],

			{ include: '@whitespace' },

			// Standard opening tag
			[/(<)(@qualifiedName)/, [
				{ token: 'delimiter.start', bracket: '@open' },
				{ token: 'tag.tag-$2', bracket: '@open', next: '@tag.$2' }]],

			// Standard closing tag
			[/(<\/)(@qualifiedName)(\s*)(>)/, [
				{ token: 'delimiter.end', bracket: '@open' },
				{ token: 'tag.tag-$2', bracket: '@close' },
				'',
				{ token: 'delimiter.end', bracket: '@close' }]],

			// Meta tags - instruction
			[/(<\?)(@qualifiedName)/, [
				{ token: 'delimiter.start', bracket: '@open' },
				{ token: 'metatag.instruction', next: '@tag' }]],

			// Meta tags - declaration
			[/(<\!)(@qualifiedName)/, [
				{ token: 'delimiter.start', bracket: '@open' },
				{ token: 'metatag.declaration', next: '@tag' }]],

			// CDATA
			[/<\!\[CDATA\[/, { token: 'delimiter.cdata', bracket: '@open', next: '@cdata' }],

			[/&\w+;/, 'string.escape'],

            // constant
            //[/(&)([:\p{L}_][:\p{L}\d_.-]*|#[\d]+|#x[\da-fA-F]+)(;)/, 'constant.character.entity']
            [/(&)([:\p{L}_][:\p{L}\d_.-]*|#[\d]+|#x[\da-fA-F]+)(;)/,
                [
                    { token: 'punctuation.definition.constant' },
                    { token: 'constant.character.entity' },
                    { token: 'punctuation.definition.constant' }
                ]
		    ],
		],

		cdata: [
			[/[^\]]+/, ''],
			[/\]\]>/, { token: 'delimiter.cdata', bracket: '@close', next: '@pop' }],
			[/\]/, '']
		],

		tag: [
			[/[ \t\r\n]+/, '' ],
			[/(@qualifiedName)(\s*=\s*)("[^"]*"|'[^']*')/, ['attribute.name', '', 'attribute.value']],
			[/(@qualifiedName)(\s*=\s*)("[^">?\/]*|'[^'>?\/]*)(?=[\?\/]\>)/, ['attribute.name', '', 'attribute.value']],
			[/(@qualifiedName)(\s*=\s*)("[^">]*|'[^'>]*)/, ['attribute.name', '', 'attribute.value']],
			[/@qualifiedName/, 'attribute.name'],
			[/\?>/, { token: 'delimiter.start', bracket: '@close', next: '@pop' }],
			[/(\/)(>)/, [
				{ token: 'tag.tag-$S2', bracket: '@close' },
				{ token: 'delimiter.start', bracket: '@close', next: '@pop' }]],
			[/>/, { token: 'delimiter.start', bracket: '@close', next: '@pop' }],
		],

		whitespace: [
			[/[ \t\r\n]+/, ''],
			[/<!--/, { token: 'comment', bracket: '@open', next: '@comment' }]
		],

		comment: [
			[/[^<\-]+/, 'comment.content' ],
			[/-->/,  { token: 'comment', bracket: '@close', next: '@pop' } ],
			[/<!--/, 'comment.content.invalid'],
			[/[<\-]/, 'comment.content' ]
		],
	},
};
