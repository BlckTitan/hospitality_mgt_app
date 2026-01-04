import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

export default  function BootstrapModal(props) {
  
  return (
    <Modal
      {...props}
      size="lg"
      aria-labelledby="contained-modal-title-vcenter"
      centered
    >
      <Modal.Header closeButton>

        <Modal.Title id="contained-modal-title-vcenter">
          {props.heading || 'Modal Heading'}
        </Modal.Title>

      </Modal.Header>

      <Modal.Body>
        {props.body || 'Modal Body'}
      </Modal.Body>
      
    </Modal>
  );
}
