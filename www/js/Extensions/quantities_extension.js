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
            const $ulItem = $('#quantities');
            $ulItem.append(`<h3>${retValue[0].modelName}</h3>`);
            retValue[1].forEach((element, i) => {
                const liItem = document.createElement('li');
                liItem.classList.add(
                    'list-group-item',
                    'list-group-item-action',
                    'row',
                    'mx-0',
                    'd-flex',
                    'p-1'
                );
                liItem.dataset.elementId = element.dbId;

                const elemNumSpan = document.createElement('span');
                elemNumSpan.classList.add(
                    'col-1',
                    'text-center',
                    'border-right',
                    'px-1'
                );
                elemNumSpan.innerText = i + 1;
                liItem.appendChild(elemNumSpan);

                const elemPhaseSpan = document.createElement('span');
                elemPhaseSpan.classList.add(
                    'col-6',
                    'border-right',
                    'text-truncate',
                    'px-1'
                );
                elemPhaseSpan.innerText = element.phase;
                liItem.appendChild(elemPhaseSpan);

                const elemVolSpan = document.createElement('span');
                elemVolSpan.classList.add(
                    'col-3',
                    'text-center',
                    'border-right',
                    'px-0'
                );
                elemVolSpan.innerText = Math.round(element.volume * 100) / 100;
                liItem.appendChild(elemVolSpan);

                const elemPriceSpan = document.createElement('span');
                elemPriceSpan.classList.add('col-2', 'text-center', 'px-0');
                elemPriceSpan.innerText =
                    Math.round(element.volume * 300 * 100) / 100;
                liItem.appendChild(elemPriceSpan);

                $ulItem.append(liItem);
            });
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
    pdb.enumObjects(function(dbId) {
        if (dbId === 1) {
            const obj = pdb.getObjectProperties(dbId);
            const modelName = obj.name;
            data.push({ modelName });
            return true;
        }
    });
    pdb.enumObjects(function(dbId) {
        const objProps = pdb.getObjectProperties(dbId, [
            'Material',
            'Volume',
            'SDEV_PhysicalCode'
        ]);
        if (objProps && objProps.properties) {
            const hasPhysicalCode = objProps.properties.findIndex(
                propObj => propObj.displayName === 'SDEV_PhysicalCode'
            );
            if (hasPhysicalCode !== -1) {
                const volumeObj = objProps.properties.find(
                    propObj => propObj.displayName === 'Volume'
                );
                const materialObj = objProps.properties.find(
                    propObj => propObj.displayName === 'Material'
                );
                const phaseObj = objProps.properties.find(
                    propObj => propObj.displayName === 'SDEV_PhysicalCode'
                );
                if (volumeObj && materialObj) {
                    const volume = volumeObj.displayValue * 0.0283168;
                    const material = materialObj.displayValue;
                    const phase = phaseObj.displayValue;
                    totalElements = [
                        ...totalElements,
                        { dbId, volume, material, phase }
                    ];
                }
            }
        }
    });

    data.push(totalElements);

    return data;
}
