import { addElements, displayElements } from '../indexedDB/index.js';

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
                            console.log(objProps);
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
                                    const volumeObj = objProps.properties.find(
                                        propObj =>
                                            propObj.displayName ===
                                            'SDEV_Volume'
                                    );
                                    const materialObj = objProps.properties.find(
                                        propObj =>
                                            propObj.displayName === 'Material'
                                    );
                                    const structureObj = objProps.properties.find(
                                        propObj =>
                                            propObj.displayName ===
                                            'SDEV_StructureCode'
                                    );
                                    const segmentObj = objProps.properties.find(
                                        propObj =>
                                            propObj.displayName ===
                                            'SDEV_SegmentCode'
                                    );
                                    const areaObj = objProps.properties.find(
                                        propObj =>
                                            propObj.displayName === 'SDEV_Area'
                                    );
                                    const guidObj = objProps.properties.find(
                                        propObj =>
                                            propObj.displayName === 'GUID'
                                    );
                                    if (volumeObj && materialObj) {
                                        const structure =
                                            structureObj.displayValue;
                                        const segment = segmentObj.displayValue;
                                        const area = areaObj
                                            ? Math.round(areaObj.displayValue)
                                            : 0;
                                        const material =
                                            materialObj.displayValue;
                                        const volume = volumeObj.displayValue;
                                        const guid = guidObj.displayValue;
                                        totalElements = [
                                            ...totalElements,
                                            {
                                                guid,
                                                dbId,
                                                structure,
                                                segment,
                                                material,
                                                properties: [{ area, volume }]
                                            }
                                        ];
                                    }
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
                // allModelsData.forEach(element => addElement(element));
                addElements(allModelsData);

                displayElements();
            }
        } catch (err) {
            console.log(err);
        }
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension(
    PopulateDatabase.ExtensionId,
    PopulateDatabase
);
