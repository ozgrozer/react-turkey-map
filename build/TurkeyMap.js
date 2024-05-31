"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _react = require("react");
var _cities = _interopRequireDefault(require("./cities"));
var _styleModule = _interopRequireDefault(require("./style.module.scss"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
var _default = exports["default"] = function _default(_ref) {
  var colorData = _ref.colorData;
  var _useState = (0, _react.useState)(''),
    _useState2 = _slicedToArray(_useState, 2),
    tooltip = _useState2[0],
    setTooltip = _useState2[1];
  var _useState3 = (0, _react.useState)({
      top: 0,
      left: 0
    }),
    _useState4 = _slicedToArray(_useState3, 2),
    position = _useState4[0],
    setPosition = _useState4[1];
  var handleMouseOver = function handleMouseOver(event) {
    if (event.target.tagName === 'path') {
      var city = event.target.parentNode.getAttribute('data-city');
      setTooltip( /*#__PURE__*/React.createElement("div", null, city));
    }
  };
  var handleMouseMove = function handleMouseMove(event) {
    setPosition({
      top: event.pageY + 25,
      left: event.pageX
    });
  };
  var handleMouseOut = function handleMouseOut() {
    setTooltip('');
  };
  var handleClick = function handleClick(event) {
    if (event.target.tagName === 'path') {
      var parent = event.target.parentNode;
      var city = parent.getAttribute('data-city');
      var plate = parent.getAttribute('data-plate');
      console.log({
        city: city,
        plate: plate
      });
    }
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: _styleModule["default"].tooltip,
    style: {
      top: position.top,
      left: position.left
    }
  }, tooltip), /*#__PURE__*/React.createElement("div", {
    className: _styleModule["default"].turkeyMapWrapper
  }, /*#__PURE__*/React.createElement("svg", {
    version: "1.1",
    onClick: handleClick,
    className: _styleModule["default"].turkeyMap,
    onMouseOut: handleMouseOut,
    onMouseOver: handleMouseOver,
    onMouseMove: handleMouseMove,
    viewBox: "0 0 1007.478 527.323",
    xmlns: "http://www.w3.org/2000/svg"
  }, /*#__PURE__*/React.createElement("g", {
    id: "turkiye"
  }, _cities["default"].map(function (city, key) {
    return /*#__PURE__*/React.createElement("g", {
      key: key,
      id: city.plate,
      "data-city": city.city,
      "data-plate": city.plate
    }, colorData[city.plate] ? /*#__PURE__*/React.createElement("path", {
      d: city.draw,
      style: {
        fill: colorData[city.plate]
      }
    }) : /*#__PURE__*/React.createElement("path", {
      d: city.draw
    }));
  })))));
};