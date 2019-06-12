import { addElements, getElements } from '../indexedDB/index.js';
import { dashboard } from './dashboard.js';

const PROP_NAMES = [
    'GUID',
    'SDEV_StructureCode',
    'SDEV_SegmentCode',
    'Assembly Code',
    'Material',
    'SDEV_Volume',
    'SDEV_Area',
    'SDEV_SegmentPart'
];

class PopulateDatabase extends Autodesk.Viewing.Extension {
    constructor(viewer, options) {
        super(viewer, options);

        this.viewer = viewer;

        this.onGeometryLoadBinded = this.onGeometryLoadEvent.bind(this);

        this.loadMessage = PopulateDatabase.ExtensionId + ' loaded';
        this.unloadMessage = PopulateDatabase.ExtensionId + ' unloaded';
    }

    static get ExtensionId() {
        return 'PopulateDatabaseExtension';
    }

    load() {
        console.log(this.loadMessage);
        this.viewer.addEventListener(
            Autodesk.Viewing.GEOMETRY_LOADED_EVENT,
            this.onGeometryLoadBinded
        );
        return true;
    }

    unload() {
        console.log(this.unloadMessage);
        this.viewer.removeEventListener(
            Autodesk.Viewing.GEOMETRY_LOADED_EVENT,
            this.onGeometryLoadBinded
        );
        this.onGeometryLoadBinded = null;
        return true;
    }

    async onGeometryLoadEvent(event) {
        try {
            const models = this.viewer.impl.modelQueue().getModels();
            let modelsData = [];
            for (let i = 0; i < models.length; i++) {
                const modelData = await models[i]
                    .getPropertyDb()
                    .executeUserFunction(function userFunction(pdb) {
                        let modelObjects = [];
                        pdb.enumObjects(function(dbId) {
                            const objProps = pdb.getObjectProperties(dbId);
                            // console.log(objProps);
                            if (
                                objProps &&
                                objProps.properties &&
                                objProps.name.startsWith('SDEV')
                            ) {
                                const index = objProps.properties.findIndex(
                                    propObj =>
                                        propObj.displayName ===
                                        'SDEV_StructureCode'
                                );
                                if (index !== -1)
                                    modelObjects = [...modelObjects, objProps];
                            }
                        });
                        return modelObjects;
                    });
                modelsData = [...modelsData, ...modelData];
            }

            if (!modelsData) {
                console.log('Model doesn\'t contain valid elemens.');
            } else {
                let elements = [];
                modelsData.forEach(objProps => {
                    const element = this.extractProperties(
                        objProps.dbId,
                        objProps.properties
                    );
                    elements = [...elements, element];
                });
                addElements(elements);
                this.displayDashboard();
                // this.displayTableElements();
            }
        } catch (err) {
            console.log(err);
        }
    }

    /**
     * @param {number} dbId Id used to identify the model element in the viewer.
     * @param {Array} properties Array of objects containing the properties of the model element
     * @returns Object containing the dbId and the required properties.
     * @memberof PopulateDatabase
     */
    extractProperties(dbId, properties) {
        const element = { dbId, properties: [] };
        const geometry = {};
        PROP_NAMES.forEach(propName => {
            const obj = properties.find(
                propObj => propObj.displayName === propName
            );
            const arr = propName
                .toLocaleLowerCase()
                .replace(' ', '')
                .split('_');
            const name = arr[arr.length - 1];
            if (name === 'area' || name === 'volume') {
                geometry[name] =
                    typeof obj === 'undefined' ? 0 : obj.displayValue;
            } else {
                element[name] =
                    typeof obj === 'undefined' ? '' : obj.displayValue;
            }
        });
        element.properties.push(geometry);
        return element;
    }

    async displayDashboard() {
        const data = await getElements('part');
        console.log(data);

        let segments = [];
        data.forEach(element => {
            const index = segments.findIndex(
                obj =>
                    obj.name === `${element.segmentcode}-${element.segmentpart}`
            );
            if (index === -1) {
                segments.push({
                    name: `${element.segmentcode}-${element.segmentpart}`,
                    totalPrice:
                        element.properties[0].area * 10 +
                        element.properties[0].volume * 75
                });
            } else {
                segments[index].totalPrice +=
                    element.properties[0].area * 10 +
                    element.properties[0].volume * 75;
            }
        });

        segments.forEach(segment => {
            segment.start = Math.floor(Math.random() * 11);
            do {
                segment.end = Math.floor(Math.random() * 11);
            } while (segment.end < segment.start);
        });

        dashboard('#charts', segments);
    }

    async displayTableElements() {
        const $tbody = $('#quantities table tbody');
        $tbody.empty();

        const data = await getElements('part');
        data.forEach((element, i) => {
            const tr = document.createElement('tr');
            const formworkPrice = Math.round(element.properties[0].area * 10);
            const concretePrice =
                Math.round(element.properties[0].volume * 100 * 75) / 100;
            const totalPrice = formworkPrice + concretePrice;
            const areaChange = this.compare(element.properties, 'area');
            const volumeChange = this.compare(element.properties, 'volume');
            tr.innerHTML = `
                    <th scope="row">${i}</th>
                    <td>${element.structurecode}</td>
                    <td>${element.segmentcode}</td>
                    <td>${element.assemblycode}</td>
                    <td>${element.properties[0].area} ${areaChange}</td>
                    <td>${formworkPrice}</td>
                    <td>${element.material}</td>
                    <td>${Math.round(element.properties[0].volume * 100) /
                        100} ${volumeChange}</td>
                    <td>${concretePrice}</td>
                    <td>${totalPrice}`;

            $tbody.append(tr);
        });
    }

    /**
     *
     * @param {Array} arr Array of properties to compare
     * @param {String} prop Name of property to compare
     */
    compare(arr, prop) {
        let res = '';
        if (arr.length > 1) {
            res =
                arr[0][prop] > arr[1][prop]
                    ? '<span class="badge badge-success">+</span>'
                    : arr[0][prop] < arr[1][prop]
                        ? '<span class="badge badge-danger">-</span>'
                        : '';
        }

        return res;
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension(
    PopulateDatabase.ExtensionId,
    PopulateDatabase
);
