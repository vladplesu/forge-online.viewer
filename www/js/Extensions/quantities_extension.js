import pieChart from '../pie-chart-generator.js';

function QuantitiesList(viewer, options) {
    Autodesk.Viewing.Extension.call(this, viewer, options);
}

QuantitiesList.prototype = Object.create(Autodesk.Viewing.Extension.prototype);
QuantitiesList.prototype.constructor = QuantitiesList;

QuantitiesList.prototype.onGeometryLoadEvent = async function(event) {
    try {
        const models = this.viewer.impl.modelQueue().getModels();
        const lastModelAdded = models[models.length - 1];
        let allModelsData = [];
        for (let i = 0; i < models.length; i++) {
            const modelData = await models[i]
                .getPropertyDb()
                .executeUserFunction(userFunction);
            allModelsData = [...allModelsData, ...modelData[1]];
        }

        if (!allModelsData) {
            console.log('Model doesn\'t contain valid elemens.');
        } else {
            const $table = $('#quantities table');
            const $tbody = $('#quantities table tbody');
            $tbody[0].innerHTML = '';
            allModelsData.forEach((element, i) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <th scope="row">${i + 1}</th>
                    <td>${element.structure}</td>
                    <td>${element.segment}</td>
                    <td>${element.assemblyCode}</td>
                    <td>${element.area}</td>
                    <td>${element.formworkPrice} €</td>
                    <td>${element.material}</td>
                    <td>${Math.round(element.volume * 100) / 100}</td>
                    <td>${element.materialPrice} €</td>
                    <td>${element.totalPrice} €`;

                $table.append(tr);
            });
        }

        let chartData = allModelsData;
        if (chartData) {
            let priceChart = [];
            let materialChart = [];
            let materialTypeChart = [
                { name: 'Formwork', totalPrice: 0 },
                { name: 'Concrete', totalPrice: 0 }
            ];
            let totalVolume = 0;
            let totalPrice = 0;
            chartData.forEach(element => {
                const segmentIndex = priceChart.findIndex(
                    obj => obj.segment === element.segment
                );
                if (segmentIndex === -1) {
                    priceChart = [
                        ...priceChart,
                        {
                            segment: element.segment,
                            totalPrice: element.totalPrice
                        }
                    ];
                } else {
                    priceChart[segmentIndex].totalPrice += element.totalPrice;
                }

                const materialIndex = materialChart.findIndex(
                    obj => obj.material === element.material
                );

                if (materialIndex === -1) {
                    materialChart = [
                        ...materialChart,
                        {
                            material: element.material,
                            totalPrice: element.materialPrice
                        }
                    ];
                } else {
                    materialChart[materialIndex].totalPrice +=
                        element.materialPrice;
                }

                materialTypeChart[0].totalPrice += element.formworkPrice;
                materialTypeChart[1].totalPrice += element.materialPrice;

                totalVolume += element.volume;
                totalPrice += element.formworkPrice + element.materialPrice;
            });
            const $genInfo = $('#general-info');
            $genInfo[0].innerHTML = `
                <span class='col text-center h4'>
                    Total volume: ${Math.round(totalVolume)}
                </span>
                <span class='col text-center h4'>
                    Total Price: ${totalPrice} €
                </span>`;
            const $charts = $('#charts');
            $charts[0].innerHTML = '';
            pieChart(priceChart, 'segment', 'totalPrice', 'Price Per Segment');
            pieChart(
                materialChart,
                'material',
                'totalPrice',
                'Price Per Concrete Type'
            );
            pieChart(
                materialTypeChart,
                'name',
                'totalPrice',
                'Price Per Materials'
            );
        }
    } catch (err) {
        console.log(err);
    }
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
        console.log(objProps);
        if (
            objProps &&
            objProps.properties &&
            objProps.name.startsWith('SDEV')
        ) {
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
                const assemblyObj = objProps.properties.find(
                    propObj => propObj.displayName === 'Assembly Code'
                );
                const areaObj = objProps.properties.find(
                    propObj => propObj.displayName === 'SDEV_Area'
                );
                if (volumeObj && materialObj) {
                    const structure = structureObj.displayValue;
                    const segment = segmentObj.displayValue;
                    const assemblyCode = assemblyObj
                        ? assemblyObj.displayValue
                        : '';
                    const area = areaObj ? Math.round(areaObj.displayValue) : 0;
                    const formworkPrice = Math.round(area * 10);
                    const material = materialObj.displayValue;
                    const volume = volumeObj.displayValue;
                    const materialPrice = Math.round(volume * 75);
                    const totalPrice = formworkPrice + materialPrice;
                    totalElements = [
                        ...totalElements,
                        {
                            dbId,
                            structure,
                            segment,
                            assemblyCode,
                            area,
                            formworkPrice,
                            material,
                            volume,
                            materialPrice,
                            totalPrice
                        }
                    ];
                }
            }
        }
    });

    // totalElements.sort((a, b) => a.volume - b.volume);

    data.push(totalElements);

    return data;
}
