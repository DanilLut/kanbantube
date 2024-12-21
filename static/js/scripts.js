document.addEventListener('DOMContentLoaded', () => {
    const board = document.querySelector('.board');
    const initialList = document.querySelector('.initial-list');
    const boardNameInput = document.querySelector('#boardName');

    let draggedCard = null;

    function addCardEvents(card) {
        card.addEventListener('dragstart', () => {
            draggedCard = card;
            card.classList.add('dragging');
        });

        card.addEventListener('dragend', () => {
            draggedCard = null;
            card.classList.remove('dragging');
        });

        card.addEventListener('dblclick', () => {
            // Return card to initial list
            if (card.parentElement !== initialList) {
                initialList.appendChild(card);
            }
        });
    }

    function addColumnEvents(column) {
        const header = column.querySelector('h2');
        header.addEventListener('dblclick', () => {
            column.remove();
        });

        header.addEventListener('blur', () => {
            if (header.textContent.trim() === '') {
                header.textContent = 'Untitled Section';
            }
        });

        column.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingCard = document.querySelector('.dragging');
            if (draggingCard) {
                const afterElement = getDragAfterElement(column, e.clientY);
                if (afterElement == null) {
                    column.appendChild(draggingCard);
                } else {
                    column.insertBefore(draggingCard, afterElement);
                }
            }
        });
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [
            ...container.querySelectorAll('.card:not(.dragging)')
        ];

        return draggableElements.reduce(
            (closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            },
            { offset: Number.NEGATIVE_INFINITY }
        ).element;
    }

    document.querySelector('#generateButton').addEventListener('click', async () => {
        const playlistUrl = document.querySelector('#playlistUrl').value;

        const response = await fetch('/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playlistUrl })
        });

        const data = await response.json();
        if (data.error) {
            alert(data.error);
            return;
        }

        initialList.innerHTML = '';
        data.videos.forEach(video => {
            const card = document.createElement('div');
            card.classList.add('card');
            card.draggable = true;
            card.innerHTML = `
                <img draggable="false" src="${video.thumbnail}" alt="${video.title}">
                <div><a draggable="false" id="videoUrl" href="${video.url}" target="_blank" title="${video.title}">${video.title}</a></div>
                <div draggable="false" id="duration">${video.duration}</div>
                <div><a draggable="false" id="owner" href="https://youtube.com/channel/${video.ownerChannelId}" target="_blank" title="${video.ownerChannelTitle}">${video.ownerChannelTitle}</a></div>
            `;
            addCardEvents(card);
            initialList.appendChild(card);
        });
    });

    document.querySelector('#addColumn').addEventListener('click', () => {
        const newColumn = document.createElement('div');
        newColumn.classList.add('column');
        newColumn.innerHTML = `<h2 contenteditable="true">New Section</h2>
        <div class="card-controls">
            <button class="sort-btn" onclick="sortVideos(this)" data-sort-type="↑">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-down-0-1"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><rect x="15" y="4" width="4" height="6" ry="2"/><path d="M17 20v-6h-2"/><path d="M15 20h4"/></svg>
            </button>
            <button class="remove-btn" onclick="removeColumn(this)">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
            <button class="move-up-btn" onclick="moveColumn(this, 'up')">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-move-left"><path d="M6 8L2 12L6 16"/><path d="M2 12H22"/></svg>
            </button>
            <button class="move-down-btn" onclick="moveColumn(this, 'down')">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-move-right"><path d="M18 8L22 12L18 16"/><path d="M2 12H22"/></svg>
            </button>
        </div>`;
        board.appendChild(newColumn);
        addColumnEvents(newColumn);
    });

    document.querySelector('#exportData').addEventListener('click', () => {
        const data = {
            boardName: boardNameInput.value.trim() || 'Untitled Board',
            sections: Array.from(document.querySelectorAll('.column')).map(column => {
                return {
                    title: column.querySelector('h2').textContent.trim(),
                    cards: Array.from(column.querySelectorAll('.card')).map(card => {
                        return {
                            thumbnail: card.querySelector('img').src,
                            title: card.querySelector('#videoUrl').textContent.trim(),
                            url: card.querySelector('#videoUrl').href,
                            ownerChannelTitle: card.querySelector('#owner').textContent.trim(),
                            ownerChannelId: new URL(card.querySelector('#owner').href).pathname.split("/channel/")[1],
                            duration: card.querySelector('#duration').textContent.trim(),
                        };
                    })
                };
            })
        };
        const dataStr = JSON.stringify(data);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${data.boardName.replace(/[^a-z0-9]/gi, '_')}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    document.querySelector('#importData').addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.addEventListener('change', () => {
            const file = input.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const data = JSON.parse(e.target.result);
                    boardNameInput.value = data.boardName || 'Untitled Board';
                    board.innerHTML = '';
                    data.sections.forEach(section => {
                        const column = document.createElement('div');
                        column.classList.add('column');
                        column.innerHTML = `<h2 contenteditable="true">${section.title}</h2>
                        <div class="card-controls">
                            <button class="sort-btn" onclick="sortVideos(this)" data-sort-type="↑">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-down-0-1"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><rect x="15" y="4" width="4" height="6" ry="2"/><path d="M17 20v-6h-2"/><path d="M15 20h4"/></svg>
                            </button>
                            <button class="remove-btn" onclick="removeColumn(this)">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                            </button>
                            <button class="move-up-btn" onclick="moveColumn(this, 'up')">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-move-left"><path d="M6 8L2 12L6 16"/><path d="M2 12H22"/></svg>
                            </button>
                            <button class="move-down-btn" onclick="moveColumn(this, 'down')">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-move-right"><path d="M18 8L22 12L18 16"/><path d="M2 12H22"/></svg>
                            </button>
                        </div>`;
                        section.cards.forEach(cardData => {
                            const card = document.createElement('div');
                            card.classList.add('card');
                            card.draggable = true;
                            card.innerHTML = `
                                <img draggable="false" src="${cardData.thumbnail}" alt="${cardData.title}">
                                <div><a draggable="false" id="videoUrl" href="${cardData.url}" title="${cardData.title}" target="_blank">${cardData.title}</a></div>
                                <div draggable="false" id="duration">${cardData.duration}</div>
                                <div><a draggable="false" id="owner" href="https://youtube.com/channel/${cardData.ownerChannelId}" target="_blank" title="${cardData.ownerChannelTitle}">${cardData.ownerChannelTitle}</a></div>
                            `;
                            addCardEvents(card);
                            column.appendChild(card);
                        });
                        board.appendChild(column);
                        addColumnEvents(column);
                    });
                };
                reader.readAsText(file);
            }
        });
        input.click();
    });

    document.querySelectorAll('.card').forEach(addCardEvents);
    document.querySelectorAll('.column').forEach(addColumnEvents);
});

const css = "* { cursor: ew-resize !important; }",
ewResize = document.createElement("style");
if (ewResize.styleSheet) {
    ewResize.styleSheet.cssText = css;
} else {
    ewResize.appendChild(document.createTextNode(css));
}

function clickAndDrag(selector, scroll_speed = 1, classOnEvent = 'grabbed_elem') {
    const slider = document.querySelector(selector);
    let isDown = false;
    let startX;
    let scrollLeft;

    slider.addEventListener('mousedown', (e) => {
        if (!e.ctrlKey) return; // Only start dragging if Ctrl is pressed
        e.preventDefault();
        isDown = true;
        slider.classList.add(classOnEvent);
        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;

        document.body.appendChild(ewResize);
        
        // prevent default child behavior
        document.body.addEventListener('click', function(event) {
            if (slider.contains(event.target)) {
                event.preventDefault();
            }
        });
    });

    slider.addEventListener('mouseleave', () => {
        isDown = false;
        slider.classList.remove(classOnEvent);
    });

    slider.addEventListener('mouseup', () => {
        isDown = false;
        slider.classList.remove(classOnEvent);
        ewResize.remove();
    });

    slider.addEventListener('mousemove', (e) => {
        if (!isDown || !e.ctrlKey) return; // Only move if Ctrl is pressed
        e.preventDefault();
        const x = e.pageX - slider.offsetLeft;
        const walk = (x - startX) * scroll_speed; // scroll-fast
        slider.scrollLeft = scrollLeft - walk;
    });
}

// usage
clickAndDrag('.board-container');

function sortVideos(button) {
    // Get the column that the button belongs to
    const column = button.closest('.column');
    
    // Get all cards in the column
    const cards = Array.from(column.querySelectorAll('.card'));
    
    // Check current sorting mode (ascending or descending)
    const isAscending = button.dataset.sortType == '↑';
    console.log(button.dataset.sortType);
    
    // Sort cards based on video duration
    cards.sort((a, b) => {
        const durationA = parseDuration(a.querySelector('#duration').textContent);
        const durationB = parseDuration(b.querySelector('#duration').textContent);
        return isAscending ? durationA - durationB : durationB - durationA;
    });
    
    // Append the sorted cards back into the column
    cards.forEach(card => column.appendChild(card));
    
    // Toggle the button text to reflect the new sorting mode
    button.innerHTML = isAscending ?
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-down-0-1"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><rect x="15" y="4" width="4" height="6" ry="2"/><path d="M17 20v-6h-2"/><path d="M15 20h4"/></svg>'
        :
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-up-1-0"><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/><path d="M17 10V4h-2"/><path d="M15 10h4"/><rect x="15" y="14" width="4" height="6" ry="2"/></svg>';
    button.dataset.sortType = isAscending ? '↓' : '↑';
}

// Helper function to convert video duration to seconds
function parseDuration(duration) {
    // Ensure that the duration is a valid string and matches the expected format
    const regex = /^(\d{2}):(\d{2}):(\d{2})$/; // Format: HH:MM:SS
    const match = duration.trim().match(regex);
    
    if (match) {
        const hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const seconds = parseInt(match[3], 10);
        return hours * 3600 + minutes * 60 + seconds;
    }
    
    // Handle cases where the duration might not be in the expected format (e.g., just MM:SS)
    const shortRegex = /^(\d{2}):(\d{2})$/; // Format: MM:SS
    const shortMatch = duration.trim().match(shortRegex);
    
    if (shortMatch) {
        const minutes = parseInt(shortMatch[1], 10);
        const seconds = parseInt(shortMatch[2], 10);
        return minutes * 60 + seconds;
    }
    
    // Return 0 if the format is not recognized or is invalid
    return 0;
}

function removeColumn(button) {
    // Get the column that the button belongs to
    const column = button.closest('.column');
    
    // Remove the column from the DOM
    column.remove();
}

function moveColumn(button, direction) {
    const column = button.closest('.column');
    const columnsContainer = column.parentElement;
    
    if (direction === 'up') {
        const previousColumn = column.previousElementSibling;
        if (previousColumn) {
            columnsContainer.insertBefore(column, previousColumn);
        }
    } else if (direction === 'down') {
        const nextColumn = column.nextElementSibling;
        if (nextColumn) {
            columnsContainer.insertBefore(nextColumn, column);
        }
    }
}