import {
    addElements,
    displayElements,
    displayDashboard
} from '../indexedDB/index.js';

const PROP_NAMES = [
    'GUID',
    'SDEV_StructureCode',
    'SDEV_SegmentCode',
    'Assembly Code',
    'Material',
    'SDEV_Volume',
    'SDEV_Area'
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
            let allModelsData = [];
            for (let i = 0; i < models.length; i++) {
                const modelData = await models[i]
                    .getPropertyDb()
                    .executeUserFunction(function userFunction(pdb) {
                        let totalElements = [];
                        pdb.enumObjects(function(dbId) {
                            const objProps = pdb.getObjectProperties(dbId);
                            // console.log(objProps);
                            if (
                                objProps &&
                                objProps.properties &&
                                objProps.name.startsWith('SDEV')
                            ) {
                                const hasPhysicalCode = objProps.properties.findIndex(
                                    propObj =>
                                        propObj.displayName ===
                                        'SDEV_StructureCode'
                                );
                                if (hasPhysicalCode !== -1) {
                                    totalElements = [
                                        ...totalElements,
                                        objProps
                                    ];
                                }
                            }
                        });

                        return totalElements;
                    });
                allModelsData = [...allModelsData, ...modelData];
            }

            if (!allModelsData) {
                console.log('Model doesn\'t contain valid elemens.');
            } else {
                let allElements = [];
                allModelsData.forEach(objProps => {
                    const element = this.extractProperties(
                        objProps.dbId,
                        objProps.properties
                    );
                    allElements = [...allElements, element];
                });
                addElements(allElements);
                // displayElements();
                displayDashboard();
            }
        } catch (err) {
            console.log(err);
        }
    }

    extractProperties(dbId, properties) {
        const element = { dbId, properties: [] };
        const dimensions = {};
        PROP_NAMES.forEach(propName => {
            const obj = this.getObjectProps(properties, propName);
            const arr = propName
                .toLocaleLowerCase()
                .replace(' ', '')
                .split('_');
            const name = arr[arr.length - 1];
            if (name === 'area' || name === 'volume') {
                dimensions[name] =
                    typeof obj === 'undefined' ? 0 : obj.displayValue;
            } else {
                element[name] =
                    typeof obj === 'undefined' ? '' : obj.displayValue;
            }
        });
        element.properties.push(dimensions);
        return element;
    }

    getObjectProps(properties, nameProp) {
        const prop = properties.find(
            propObj => propObj.displayName === nameProp
        );
        return prop;
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension(
    PopulateDatabase.ExtensionId,
    PopulateDatabase
);
