function onOpen() {
  DocumentApp.getUi()
    .createMenu('커스텀 메뉴')
    .addItem('그리기 시작', 'startDrawing')
    .addItem('초기화', 'initializeImages') // 초기화 버튼 추가
    .addItem('서명 목록 보기', 'showImageTitles') // 이미지 타이틀 보기 메뉴 추가
    .addToUi();

  showImageTitles();
}

function showImageTitles() {
  var doc = DocumentApp.getActiveDocument();
  var body = doc.getBody();
  var imageTitles = getAllImageTitles(body);

  // HTML 출력 생성
  var htmlContent = "<h3>작성 목록</h3><ul>";
  imageTitles.forEach(function(title, index) {
    // 클릭 가능한 링크로 변경하고 onclick 이벤트 추가
    htmlContent += "<li><a href='#' onclick='google.script.run.startDrawingByImageTitle(\"" + title + "\"); return false;'>" +
                  title + "</a></li>";
  });
  htmlContent += "</ul>";

  // 사이드바에 표시
  var htmlOutput = HtmlService.createHtmlOutput(htmlContent)
    .setTitle('작성 목록')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  DocumentApp.getUi().showSidebar(htmlOutput);
}

function getAllImageTitles(container) {
  var numChildren = container.getNumChildren();
  var titles = [];

  for (var i = 0; i < numChildren; i++) {
    var child = container.getChild(i);

    if (child.getType() === DocumentApp.ElementType.INLINE_IMAGE) {
      var title = child.getAltTitle() || "(타이틀 없음)";
      titles.push(title); // 이미지 타이틀 추가
    } else if (child.getNumChildren && child.getNumChildren() > 0) {
      // 하위 요소가 있는 경우 재귀적으로 탐색
      titles = titles.concat(getAllImageTitles(child));
    }
  }
  return titles;
}


function initializeImages() {
  var doc = DocumentApp.getActiveDocument();
  var body = doc.getBody();
  
  // 빈 캔버스 생성 및 Blob 변환
  var blob = createEmptyCanvasBlob();
  if (!blob) {
    DocumentApp.getUi().alert('빈 캔버스 생성에 실패했습니다.');
    return;
  }
  
  // 문서 내 이미지들을 빈 캔버스로 대체
  replaceImagesByTitle(body, "이름", blob);
  replaceImagesByTitle(body, "주민등록번호", blob);
  replaceImagesByTitle(body, "연락처", blob);
  replaceImagesByTitle(body, "주소", blob);
  replaceImagesByTitle(body, "정산계좌/예금주", blob);
}

function createEmptyCanvasBlob() {
  // 10x10 크기의 빈 흰색 이미지의 base64 데이터
  const scriptProperties = PropertiesService.getScriptProperties();
  var base64Data = scriptProperties.getProperty("white-blob");;
  return Utilities.newBlob(Utilities.base64Decode(base64Data), 'image/png', 'empty.png');
}

function replaceImagesByTitle(container, targetTitle, blob) {
  var numChildren = container.getNumChildren();

  for (var i = 0; i < numChildren; i++) {
    var child = container.getChild(i);

    if (child.getType() === DocumentApp.ElementType.INLINE_IMAGE) {
      var childTitle = child.getAltTitle();
      
      if (childTitle === targetTitle) {
        // 원래 이미지의 너비와 높이 가져오기
        var originalWidth = child.getWidth();
        var originalHeight = child.getHeight();

        // 새로운 "init" 이미지 삽입
        var parent = child.getParent();
        var insertedImage = parent.insertInlineImage(parent.getChildIndex(child), blob);

        // 삽입된 이미지 크기와 타이틀 설정
        insertedImage.setWidth(originalWidth);
        insertedImage.setHeight(originalHeight);
        insertedImage.setAltTitle(targetTitle); // 원래 타이틀 유지

        // 기존 이미지 제거
        parent.removeChild(child);
      }
    } else if (child.getNumChildren && child.getNumChildren() > 0) {
      replaceImagesByTitle(child, targetTitle, blob); // 하위 요소에서 재귀적으로 탐색
    }
  }
}

function findImageByTitle(container, targetTitle) {
  // 문서 내에서 특정 타이틀을 가진 이미지 요소를 찾음
  var numChildren = container.getNumChildren();
  for (var i = 0; i < numChildren; i++) {
    var child = container.getChild(i);
    if (child.getType() === DocumentApp.ElementType.INLINE_IMAGE) {
      if (child.getAltTitle() === targetTitle) {
        return child; // 대상 타이틀을 가진 이미지 요소 반환
      }
    } else if (child.getNumChildren && child.getNumChildren() > 0) {
      var result = findImageByTitle(child, targetTitle);
      if (result) {
        return result;
      }
    }
  }
  return null;
}

function startDrawingByImageTitle(imageTitle) {
  var doc = DocumentApp.getActiveDocument();
  var body = doc.getBody();
  
  // 지정된 타이틀을 가진 이미지 찾기
  var imageElement = findImageElementByTitle(body, imageTitle);
  
  if (imageElement) {
    // 이미지 타이틀 저장
    PropertiesService.getDocumentProperties().setProperty('imageTitle', imageTitle);

    // 그리기 다이얼로그 표시
    var html = HtmlService.createHtmlOutputFromFile('DrawDialog')
      .setWidth(600)
      .setHeight(400);
    DocumentApp.getUi().showModalDialog(html, '그리기');
  } else {
    DocumentApp.getUi().alert('해당 타이틀의 이미지를 찾을 수 없습니다.');
  }
}

function startDrawing() {
  var doc = DocumentApp.getActiveDocument();
  var selection = doc.getSelection();

  if (selection) {
    var elements = selection.getRangeElements();
    if (elements.length === 1 && elements[0].getElement().getType() === DocumentApp.ElementType.INLINE_IMAGE) {
      var imageElement = elements[0].getElement(); // 선택한 이미지 요소
      var imageTitle = imageElement.getAltTitle(); // 이미지 제목
      PropertiesService.getDocumentProperties().setProperty('imageTitle', imageTitle);

      var html = HtmlService.createHtmlOutputFromFile('DrawDialog')
        .setWidth(600)
        .setHeight(400);
      DocumentApp.getUi().showModalDialog(html, '그리기');
    } else {
      DocumentApp.getUi().alert('이미지를 선택해주세요.');
    }
  } else {
    DocumentApp.getUi().alert('이미지를 선택해주세요.');
  }
}

function replaceImage(imageData) {
  var doc = DocumentApp.getActiveDocument();
  var body = doc.getBody();
  var imageTitle = PropertiesService.getDocumentProperties().getProperty('imageTitle');

  if (imageTitle) {
    var searchResult = findImageElementByTitle(body, imageTitle);
    if (searchResult) {
      var blob = Utilities.newBlob(Utilities.base64Decode(imageData), 'image/png', 'drawing.png');
      // base64 데이터로 변환하여 alert
      var parent = searchResult.getParent();
      var insertedImage = parent.insertInlineImage(parent.getChildIndex(searchResult), blob);

      // **원래 이미지의 너비와 높이 가져오기**
      var originalWidth = searchResult.getWidth();
      var originalHeight = searchResult.getHeight();
      var originalTitle = searchResult.getAltTitle();

      // **새로운 이미지의 크기를 원래 이미지와 동일하게 설정**
      insertedImage.setWidth(originalWidth);
      insertedImage.setHeight(originalHeight);
      insertedImage.setAltTitle(originalTitle);

      // **기존 이미지 제거**
      parent.removeChild(searchResult);
    } else {
      DocumentApp.getUi().alert('이미지를 찾을 수 없습니다.');
    }
  } else {
    DocumentApp.getUi().alert('이미지 제목 정보를 찾을 수 없습니다.');
  }
}

function findImageElementByTitle(container, targetTitle) {
  var numChildren = container.getNumChildren();

  for (var i = 0; i < numChildren; i++) {
    var child = container.getChild(i);

    if (child.getType() === DocumentApp.ElementType.INLINE_IMAGE) {
      var childTitle = child.getAltTitle();
      if (childTitle === targetTitle) {
        return child;
      }
    } else if (child.getNumChildren && child.getNumChildren() > 0) {
      var result = findImageElementByTitle(child, targetTitle);
      if (result) {
        return result;
      }
    }
  }
  return null;
}
