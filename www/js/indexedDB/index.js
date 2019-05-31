import { compare } from './helpers.js';

const DB_NAME = 'sdev-demo-version-control';
const DB_VERSION = 1;
const DB_STORE_NAME = 'elements';

let db;

const openDb = () => {
    console.log('openDb ...');
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onsuccess = event => {
        db = event.target.result;
        console.log('openDb DONE');
    };

    req.onerror = event => {
        console.error('openDb:', event.target.errorCode);
    };

    req.onupgradeneeded = event => {
        console.log('openDb.onupgradeneeded');
        const store = event.currentTarget.result.createObjectStore(
            DB_STORE_NAME,
            { keyPath: 'guid' }
        );

        store.createIndex('structure', 'structurecode', { unique: false });
        store.createIndex('segment', 'segmentcode', { unique: false });
        store.createIndex('material', 'material', { unique: false });
        store.createIndex('dbId', 'dbId', { unique: false });
    };
};

/**
 * @param {string} store_name
 * @param {string} mode either "readonly" or "readwrite"
 */
const getObjectStore = (store_name, mode) => {
    const tx = db.transaction(store_name, mode);
    return tx.objectStore(store_name);
};

const displayElements = store => {
    console.log('displayElements');

    if (typeof store === 'undefined')
        store = getObjectStore(DB_STORE_NAME, 'readonly');

    const $tbody = $('#quantities table tbody');
    $tbody.empty();

    let req = store.count();
    req.onsuccess = event => {
        console.log(`Total number of elements: ${event.target.result}`);
    };

    req.onerror = () => {
        console.error('add error', this.error);
    };

    let i = 1;
    const myIndex = store.index('structure');
    req = myIndex.openCursor();
    req.onsuccess = event => {
        const cursor = event.target.result;
        if (cursor) {
            const value = cursor.value;
            const tr = document.createElement('tr');
            const formworkPrice = Math.round(value.properties[0].area * 10);
            const concretePrice =
                Math.round(value.properties[0].volume * 100 * 75) / 100;
            const totalPrice = formworkPrice + concretePrice;
            const areaChange = compare(value.properties, 'area');
            const volumeChange = compare(value.properties, 'volume');
            tr.innerHTML = `
                    <th scope="row">${i}</th>
                    <td>${value.structurecode}</td>
                    <td>${value.segmentcode}</td>
                    <td>${value.assemblycode}</td>
                    <td>${value.properties[0].area} ${areaChange}</td>
                    <td>${formworkPrice}</td>
                    <td>${value.material}</td>
                    <td>${Math.round(value.properties[0].volume * 100) /
                        100} ${volumeChange}</td>
                    <td>${concretePrice}</td>
                    <td>${totalPrice}`;

            $tbody.append(tr);

            cursor.continue();

            i++;
        } else {
            console.log('No more elements');
        }
    };
};

/**
 * @param {Array} elements
 */
const addElements = elements => {
    const store = getObjectStore(DB_STORE_NAME, 'readwrite');
    let req;
    req = store.openCursor();
    req.onsuccess = event => {
        const cursor = event.target.result;

        let msg = { removed: 0, added: 0 };
        // If the cursor is pointing at something, ask for the data
        if (cursor) {
            req = store.get(cursor.key);
            req.onsuccess = event => {
                const data = event.target.result;
                const elementIndex = elements.findIndex(
                    element => element.guid === data.guid
                );
                if (elementIndex === -1) {
                    req = store.delete(cursor.key);
                    req.onsuccess = () => {
                        console.log('Element was deleted');
                        msg.removed++;
                    };
                } else {
                    data.properties = [
                        ...elements[elementIndex].properties,
                        ...data.properties
                    ];
                    req = store.put(data);
                    req.onsuccess = () => {
                        console.log('Element was updated');
                    };
                    elements.splice(elementIndex, 1);
                }
            };

            cursor.continue();
        } else {
            console.log(elements);
            elements.forEach(element => {
                try {
                    req = store.add(element);
                } catch (err) {
                    throw err;
                }
                req.onsuccess = () => {
                    console.log('Insertion in DB successful');
                    msg.added++;
                };
                req.onerror = event => {
                    console.log(
                        'addElement error:',
                        event.target.error.message
                    );
                };
            });
            alert(
                `${msg.removed} items where removed. \n${
                    msg.added
                } items where added.`
            );
        }
    };
};

export { addElements, openDb, displayElements };
