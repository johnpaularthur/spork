# Dependency View

Get a quick overview of the project structure by opening up the dependency view (use the command search). You can zoom, pan, drag points around and hover over nodes.

![](https://raw.githubusercontent.com/johnpaularthur/johnpaularthur.github.io/master/screens/dependencyView.png)

## In Out
* Nodes that do not depend on anything are colored green : These are probably utilities.
* Nodes that only depend on other stuff are colored blue: These are probably application entry points.

![](https://raw.githubusercontent.com/johnpaularthur/johnpaularthur.github.io/master/screens/dependencyView/inOut.png)

## Circular
Circular dependencies are highlighted in red

![](https://raw.githubusercontent.com/johnpaularthur/johnpaularthur.github.io/master/screens/dependencyView/circular.png)

And also listed on the side

![](https://raw.githubusercontent.com/johnpaularthur/johnpaularthur.github.io/master/screens/dependencyView/cycles.png)

## Filter
You can filter particular nodes by specifying their name (`Ctrl|⌘ + F`).

![](https://raw.githubusercontent.com/johnpaularthur/johnpaularthur.github.io/master/screens/dependencyView/filter.png)

## Hover
When you hover over a node
* Red arrow denote stuff this file depends upon. Implies that this file cannot be extracted without also moving these files.
* Green arrows denote stuff that depends on this file. Green as this means the code in this file is moveable to another project and these links will play no part in that.

![](https://raw.githubusercontent.com/johnpaularthur/johnpaularthur.github.io/master/screens/dependencyView/hover.png)

## Size
Size is based on average of in-degree and out-degree:

![](https://raw.githubusercontent.com/johnpaularthur/johnpaularthur.github.io/master/screens/dependencyView/size.png)

## Distance
Distance is determined by how much of the file path is common between two nodes:
![](https://raw.githubusercontent.com/johnpaularthur/johnpaularthur.github.io/master/screens/dependencyView/distance.png)
