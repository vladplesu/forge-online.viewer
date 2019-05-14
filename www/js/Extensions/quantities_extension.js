import pieChart from '../pie-chart-generator.js';

function QuantitiesList(viewer, options) {
    Autodesk.Viewing.Extension.call(this, viewer, options);
}

QuantitiesList.prototype = Object.create(Autodesk.Viewing.Extension.prototype);
QuantitiesList.prototype.constructor = QuantitiesList;

QuantitiesList.prototype.onGeometryLoadEvent = function(event) {
    const models = this.viewer.impl.modelQueue().getModels();
    const lastModelAdded = models[models.length - 1];
    const quantityPromise = lastModelAdded
        .getPropertyDb()
        .executeUserFunction(userFunction);

    quantityPromise
        .then(function(retValue) {
            if (!retValue) {
                console.log('Model doesn\'t contain valid elemens.');
            }
            const $table = $('#quantities table');
            // $table.append(`<h3>${retValue[0].modelName}</h3>`);
            retValue[1].forEach((element, i) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <th scope="row">${i + 1}</th>
                    <td>${element.structure}</td>
                    <td>${element.segment}</td>
                    <td>${element.material}</td>
                    <td>${Math.round(element.volume * 100) / 100}</td>
                    <td>${Math.round(element.volume * 300 * 100) / 100} €`;

                $table.append(tr);
            });
            pieChart(retValue[2]);
        })
        .catch(err => console.log(err));
};

QuantitiesList.prototype.load = function() {
    this.onGeometryLoadBinded = this.onGeometryLoadEvent.bind(this);
    this.viewer.addEventListener(
        Autodesk.Viewing.GEOMETRY_LOADED_EVENT,
        this.onGeometryLoadBinded
    );
    return true;
};

QuantitiesList.prototype.unload = function() {
    this.viewer.removeEventListener(
        Autodesk.Viewing.GEOMETRY_LOADED_EVENT,
        this.onGeometryLoadBinded
    );
    this.onGeometryLoadBinded = null;
    return true;
};

Autodesk.Viewing.theExtensionManager.registerExtension(
    'QuantitiesExtension',
    QuantitiesList
);

function userFunction(pdb) {
    let data = [];
    let totalElements = [];
    let chartData = [];
    pdb.enumObjects(function(dbId) {
        if (dbId === 1) {
            const obj = pdb.getObjectProperties(dbId);
            const modelName = obj.name;
            data.push({ modelName });
            return true;
        }
    });
    pdb.enumObjects(function(dbId) {
        const objProps = pdb.getObjectProperties(dbId);
        // console.log(objProps);
        if (objProps && objProps.properties && objProps.name !== 'Body') {
            const hasPhysicalCode = objProps.properties.findIndex(
                propObj => propObj.displayName === 'SDEV_StructureCode'
            );
            if (hasPhysicalCode !== -1) {
                const volumeObj = objProps.properties.find(
                    propObj => propObj.displayName === 'SDEV_Volume'
                );
                const materialObj = objProps.properties.find(
                    propObj => propObj.displayName === 'Material'
                );
                const structureObj = objProps.properties.find(
                    propObj => propObj.displayName === 'SDEV_StructureCode'
                );
                const segmentObj = objProps.properties.find(
                    propObj => propObj.displayName === 'SDEV_SegmentCode'
                );
                if (volumeObj && materialObj) {
                    const volume = volumeObj.displayValue * 0.0283168;
                    const material = materialObj.displayValue;
                    const structure = structureObj.displayValue;
                    const segment = segmentObj.displayValue;
                    totalElements = [
                        ...totalElements,
                        { dbId, structure, segment, volume, material }
                    ];

                    // const segment = phase.match(reg) || ['No Segment'];
                    const segmentIndex = chartData.findIndex(
                        obj => obj.segment === segment
                    );
                    if (segmentIndex === -1) {
                        chartData = [
                            ...chartData,
                            {
                                segment,
                                volume
                            }
                        ];
                    } else {
                        chartData[segmentIndex].volume += volume;
                    }
                }
            }
        }
    });

    console.log(totalElements);
    // console.log(chartData);

    data.push(totalElements);
    data.push(chartData);

    return data;
}
