

# Node ETL Editor

## Why

Right now, this is an exercise in learning.  I work with data every day and would like to develop a project I can use daily.

This project is getting a jumpstart from the great work that has done with the alm ide.  Check out the typescript IDE over at [alm.tools](http://alm.tools) or [github](https://github.com/alm-tools/alm).

## Requirements

* Chrome
* NodeJS v6+

## Usage (Dev)

Get it:
```
git clone
```

Install dep:
```
cd spork
npm i
```

Run it:
```
npm start
```

## Useage (outside the project)

The following build build and link spork so you can run it from any directory.  Do this under the spork directory.
```
npm link
```

If it won't build due to monaco typescript issue, add this the monaco.d.ts file under "export interface IMonarchLanguage {"
```
/**
    * // Useful regular expressions
    */
qualifiedName?: RegExp;
```

Now open it in `chrome` at the URL mentioned in your console.

## Features

TODO

