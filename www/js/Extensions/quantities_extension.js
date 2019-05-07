function QuantitiesList(viewer, options) {
    Autodesk.Viewing.Extension.call(this, viewer, options);
}

QuantitiesList.prototype = Object.create(Autodesk.Viewing.Extension.prototype);
QuantitiesList.prototype.constructor = QuantitiesList;

QuantitiesList.prototype.onGeometryLoadEvent = function(event) {
    console.log('The geometry has been loaded: ' + event);
    const quantityPromise = this.viewer.model
        .getPropertyDb()
        .executeUserFunction(userFunction);

    quantityPromise
        .then(function(retValue) {
            if (!retValue) {
                console.log('Model doesn\'t contain valid elemens.');
            }
            const $ulItem = $('#quantities');
            retValue.forEach((element, i) => {
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
            console.log(retValue);
        })
        .catch(err => console.log(err));
};

QuantitiesList.prototype.load = function() {
    // console.log(
    //     'This is when the extension is loaded: ' +
    //         this.viewer +
    //         '\n======================================'
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
    let totalElements = [];
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

    return totalElements;
}
