# AGENTS Guidelines for This Repository
This project is a site builder using node based UI. It uses React + Vite and React Flow as the main UI library. It is intended to simulate early Internet design with limited functionality and clunky UI. The front-end communicates with a backend API using JSON. In this project users can build their website layout and preview the results in real time. The main engine for building the preview is p5.js.

## Architecture overview
- component P5Preview renders a preview of the webpage using p5.js
- component ExportP5Project sends JSON data to the backend API to publish the webpage.
- Each new type of node is a standalone component.
- Each type of node has an attached component rendering a button to add that type of node to the UI.

## Repository structure


## Design constraints
